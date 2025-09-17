import type { FastifyInstance } from 'fastify';
import { and, asc, count, eq } from 'drizzle-orm';
import { v4 } from 'uuid';
import { db } from '../db/sqlite/client';
import { projectGroupsTable, projectsTable } from '../db/sqlite/schema';
import { getUserIdFromRequest } from '../utils/getUserId';

const DEFAULT_GROUP_NAME = 'Domyślne';

const toResponse = (group: typeof projectGroupsTable.$inferSelect) => ({
  uuid: group.uuid,
  name: group.name,
  sortOrder: group.sort_order ?? 0,
});

const ensureDefaultGroup = async (userId: number) => {
  const existing = await db
    .select()
    .from(projectGroupsTable)
    .where(and(eq(projectGroupsTable.user_id, userId), eq(projectGroupsTable.name, DEFAULT_GROUP_NAME)))
    .limit(1);

  if (existing.length) {
    return existing[0];
  }

  const uuid = v4();
  await db.insert(projectGroupsTable).values({ uuid, name: DEFAULT_GROUP_NAME, user_id: userId, sort_order: 0 });
  const inserted = await db
    .select()
    .from(projectGroupsTable)
    .where(and(eq(projectGroupsTable.uuid, uuid), eq(projectGroupsTable.user_id, userId)))
    .limit(1);

  return inserted[0];
};

export default async function projectGroupsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => fastify.authenticate(request, reply));

  fastify.get('/api/project-groups', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { withProjects } = request.query as { withProjects?: string };

      const groups = await db
        .select()
        .from(projectGroupsTable)
        .where(eq(projectGroupsTable.user_id, userId))
        .orderBy(asc(projectGroupsTable.sort_order), asc(projectGroupsTable.name));

      const ensuredGroups = groups.length ? groups : [await ensureDefaultGroup(userId)];

      if (!withProjects) {
        return reply.send(ensuredGroups.map(toResponse));
      }

      const projects = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.user_id, userId))
        .orderBy(asc(projectsTable.name));

      return reply.send(
        ensuredGroups.map(group => ({
          ...toResponse(group),
          projects: projects.filter(project => project.group_uuid === group.uuid),
        })),
      );
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to list projects' });
    }
  });

  fastify.post('/api/project-groups', async (request, reply) => {
    try {
      const { name, sortOrder } = request.body as { name?: string; sortOrder?: number };
      if (!name || !name.trim()) return reply.code(400).send({ error: 'Name is required' });
      const userId = getUserIdFromRequest(request);

      const uuid = v4();
      await db.insert(projectGroupsTable).values({
        uuid,
        name: name.trim(),
        user_id: userId,
        sort_order: typeof sortOrder === 'number' ? sortOrder : 0,
      });

      const created = await db
        .select()
        .from(projectGroupsTable)
        .where(and(eq(projectGroupsTable.uuid, uuid), eq(projectGroupsTable.user_id, userId)))
        .limit(1);

      return reply.code(201).send(toResponse(created[0]));
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to create project' });
    }
  });

  fastify.put('/api/project-groups/:uuid', async (request, reply) => {
    try {
      const { uuid } = request.params as { uuid: string };
      const { name, sortOrder } = request.body as { name?: string; sortOrder?: number };

      if (name && !name.trim()) return reply.code(400).send({ error: 'Name cannot be empty' });
      const userId = getUserIdFromRequest(request);

      const updates: { name?: string; sort_order?: number } = {};
      if (name && name.trim()) updates.name = name.trim();
      if (typeof sortOrder === 'number') updates.sort_order = sortOrder;
      if (!Object.keys(updates).length) {
        const existing = await db
          .select()
          .from(projectGroupsTable)
          .where(and(eq(projectGroupsTable.uuid, uuid), eq(projectGroupsTable.user_id, userId)))
          .limit(1);

        if (!existing.length) return reply.code(404).send({ error: 'Project not found' });
        return reply.send(toResponse(existing[0]));
      }

      await db
        .update(projectGroupsTable)
        .set(updates)
        .where(and(eq(projectGroupsTable.uuid, uuid), eq(projectGroupsTable.user_id, userId)));

      const updated = await db
        .select()
        .from(projectGroupsTable)
        .where(and(eq(projectGroupsTable.uuid, uuid), eq(projectGroupsTable.user_id, userId)))
        .limit(1);

      if (!updated.length) return reply.code(404).send({ error: 'Project not found' });

      return reply.send(toResponse(updated[0]));
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to update project' });
    }
  });

  fastify.delete('/api/project-groups/:uuid', async (request, reply) => {
    try {
      const { uuid } = request.params as { uuid: string };
      const userId = getUserIdFromRequest(request);

      const groupRows = await db
        .select()
        .from(projectGroupsTable)
        .where(and(eq(projectGroupsTable.uuid, uuid), eq(projectGroupsTable.user_id, userId)))
        .limit(1);

      if (!groupRows.length) return reply.code(404).send({ error: 'Project not found' });
      const group = groupRows[0];

      const projectsCount = await db
        .select({ value: count() })
        .from(projectsTable)
        .where(and(eq(projectsTable.user_id, userId), eq(projectsTable.group_uuid, group.uuid)));

      if (projectsCount.length && projectsCount[0].value) {
        return reply.code(400).send({ error: 'Cannot delete non-empty project' });
      }

      await db
        .delete(projectGroupsTable)
        .where(and(eq(projectGroupsTable.uuid, uuid), eq(projectGroupsTable.user_id, userId)));

      return reply.send({ ok: true });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to delete project' });
    }
  });
}
