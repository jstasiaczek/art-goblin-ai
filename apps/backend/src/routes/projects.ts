import type { FastifyInstance } from 'fastify';
import { db } from '../db/sqlite/client';
import { historyTable, projectGroupsTable, projectsTable } from '../db/sqlite/schema';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { v4 } from 'uuid';
import { getUserIdFromRequest } from '../utils/getUserId';

type CreateProjectBody = { name: string; uuid?: string; groupUuid?: string };
type UpdateProjectBody = { name: string; groupUuid?: string };

type ProjectRow = typeof projectsTable.$inferSelect;
type ProjectGroupRow = typeof projectGroupsTable.$inferSelect;

type ProjectSummary = ProjectRow & { lastImageName: string | null; lastCreatedAt: Date | null };
type ProjectSummaryGroup = {
  uuid: string;
  name: string;
  sortOrder: number;
  projects: ProjectSummary[];
};

const findGroup = async (userId: number, uuid: string) => {
  if (!uuid) return null;
  const rows = await db
    .select()
    .from(projectGroupsTable)
    .where(and(eq(projectGroupsTable.user_id, userId), eq(projectGroupsTable.uuid, uuid)))
    .limit(1);
  return rows[0] ?? null;
};

export default async function projectsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => fastify.authenticate(request, reply));
  fastify.get('/api/projects', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const rows = await db
        .select({
          id: projectsTable.id,
          uuid: projectsTable.uuid,
          name: projectsTable.name,
          user_id: projectsTable.user_id,
          group_uuid: projectsTable.group_uuid,
          group_name: projectGroupsTable.name,
        })
        .from(projectsTable)
        .leftJoin(projectGroupsTable, eq(projectsTable.group_uuid, projectGroupsTable.uuid))
        .where(eq(projectsTable.user_id, userId))
        .orderBy(asc(projectsTable.name));
      return reply.send(rows);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to list projects' });
    }
  });

  // Projects with last generated image (summary)
  fastify.get('/api/projects/summary', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const groups = await db
        .select()
        .from(projectGroupsTable)
        .where(eq(projectGroupsTable.user_id, userId))
        .orderBy(asc(projectGroupsTable.sort_order), asc(projectGroupsTable.name));

      const projects = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.user_id, userId))
        .orderBy(asc(projectsTable.name));

      const ensuredGroups = groups.length ? groups : [];

      const uuids = projects.map(p => p.uuid);
      const historyRows = uuids.length
        ? await db
            .select({ project_uuid: historyTable.project_uuid, image_name: historyTable.image_name, create_date: historyTable.create_date })
            .from(historyTable)
            .where(and(eq(historyTable.user_id, userId), inArray(historyTable.project_uuid, uuids)))
            .orderBy(desc(historyTable.create_date))
        : [];

      const latestByProject = new Map<string, { image_name: string; create_date: Date }>();
      for (const row of historyRows) {
        if (!latestByProject.has(row.project_uuid)) {
          latestByProject.set(row.project_uuid, { image_name: row.image_name, create_date: row.create_date });
        }
      }

      const response: ProjectSummaryGroup[] = ensuredGroups.map(group => ({
        uuid: group.uuid,
        name: group.name,
        sortOrder: group.sort_order ?? 0,
        projects: projects
          .filter(project => project.group_uuid === group.uuid)
          .map(project => ({
            ...project,
            lastImageName: latestByProject.get(project.uuid)?.image_name || null,
            lastCreatedAt: latestByProject.get(project.uuid)?.create_date || null,
          })),
      }));

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to list project summaries' });
    }
  });

  fastify.get('/api/projects/:uuid', async (request, reply) => {
    try {
      const { uuid } = request.params as { uuid: string };
      const userId = getUserIdFromRequest(request);
      const rows = await db
        .select({
          id: projectsTable.id,
          uuid: projectsTable.uuid,
          name: projectsTable.name,
          user_id: projectsTable.user_id,
          group_uuid: projectsTable.group_uuid,
          group_name: projectGroupsTable.name,
        })
        .from(projectsTable)
        .leftJoin(projectGroupsTable, eq(projectsTable.group_uuid, projectGroupsTable.uuid))
        .where(and(eq(projectsTable.uuid, uuid), eq(projectsTable.user_id, userId)));
      if (!rows.length) return reply.code(404).send({ error: 'Project not found' });
      return reply.send(rows[0]);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch project' });
    }
  });

  fastify.post('/api/projects', async (request, reply) => {
    try {
      const { name, uuid, groupUuid } = request.body as CreateProjectBody;
      if (!name || !name.trim()) return reply.code(400).send({ error: 'Name is required' });
      const userId = getUserIdFromRequest(request);
      const newUuid = uuid && uuid.trim() ? uuid : v4();
      if (!groupUuid || !groupUuid.trim()) {
        return reply.code(400).send({ error: 'Group is required' });
      }
      const group = await findGroup(userId, groupUuid.trim());
      if (!group) {
        return reply.code(400).send({ error: 'Group not found' });
      }
      await db.insert(projectsTable).values({ name: name.trim(), uuid: newUuid, user_id: userId, group_uuid: group.uuid });
      const created = await db
        .select()
        .from(projectsTable)
        .where(and(eq(projectsTable.uuid, newUuid), eq(projectsTable.user_id, userId)));
      return reply.code(201).send(created[0]);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to create project' });
    }
  });

  fastify.put('/api/projects/:uuid', async (request, reply) => {
    try {
      const { uuid } = request.params as { uuid: string };
      const { name, groupUuid } = request.body as UpdateProjectBody;
      if (!name || !name.trim()) return reply.code(400).send({ error: 'Name is required' });
      const userId = getUserIdFromRequest(request);
      const updates: { name: string; group_uuid?: string } = { name: name.trim() };
      if (groupUuid && groupUuid.trim()) {
        const group = await findGroup(userId, groupUuid.trim());
        if (!group) {
          return reply.code(404).send({ error: 'Project not found' });
        }
        updates.group_uuid = group.uuid;
      }
      await db
        .update(projectsTable)
        .set(updates)
        .where(and(eq(projectsTable.uuid, uuid), eq(projectsTable.user_id, userId)));
      const updated = await db
        .select()
        .from(projectsTable)
        .where(and(eq(projectsTable.uuid, uuid), eq(projectsTable.user_id, userId)));
      if (!updated.length) return reply.code(404).send({ error: 'Project not found' });
      return reply.send(updated[0]);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to update project' });
    }
  });

  fastify.delete('/api/projects/:uuid', async (request, reply) => {
    try {
      const { uuid } = request.params as { uuid: string };
      const userId = getUserIdFromRequest(request);
      await db
        .delete(historyTable)
        .where(and(eq(historyTable.project_uuid, uuid), eq(historyTable.user_id, userId)));
      await db
        .delete(projectsTable)
        .where(and(eq(projectsTable.uuid, uuid), eq(projectsTable.user_id, userId)));
      return reply.send({ ok: true });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to delete project' });
    }
  });
}
