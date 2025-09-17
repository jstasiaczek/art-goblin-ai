import type { FastifyInstance } from 'fastify';
import { db } from '../db/sqlite/client';
import { historyTable, projectsTable } from '../db/sqlite/schema';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { GENERATED_DIR } from '../config';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { getUserIdFromRequest } from '../utils/getUserId';

const fileExists = async (filePath: string) => {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const ensureUniqueDestination = async (destinationDir: string, imageName: string) => {
  let candidateName = imageName;
  let counter = 1;
  const ext = path.extname(imageName);
  const baseName = path.basename(imageName, ext);
  let candidatePath = path.join(destinationDir, candidateName);

  while (await fileExists(candidatePath)) {
    candidateName = `${baseName}-${counter}${ext}`;
    candidatePath = path.join(destinationDir, candidateName);
    counter += 1;
  }

  return { fileName: candidateName, filePath: candidatePath };
};

export default async function historyRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => fastify.authenticate(request, reply));
  // History listing (with optional pagination)
  fastify.get('/api/history', async (request, reply) => {
    try {
      const { project_uuid, page, pageSize, favorite } = request.query as {
        project_uuid?: string;
        page?: string | number;
        pageSize?: string | number;
        favorite?: string | number | boolean;
      };

      if (!project_uuid || !project_uuid.trim()) {
        return reply.code(400).send({ error: 'project_uuid is required' });
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const pageSizeNum = Math.max(1, Math.min(100, Number(pageSize) || 50));
      const offset = (pageNum - 1) * pageSizeNum;

      const userId = getUserIdFromRequest(request);
      const favOnly = String(favorite ?? '').toLowerCase();
      const favFilter = favOnly === 'true' || favOnly === '1';

      let whereCond = and(eq(historyTable.project_uuid, project_uuid), eq(historyTable.user_id, userId));
      if (favFilter) whereCond = and(whereCond, eq(historyTable.favorite, true));

      const rows = await db
        .select()
        .from(historyTable)
        .where(whereCond)
        .orderBy(desc(historyTable.create_date))
        .limit(pageSizeNum)
        .offset(offset);

      return reply.send(rows);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to load history' });
    }
  });

  fastify.get('/api/history/meta', async (request, reply) => {
    try {
      const { project_uuid, page, pageSize, favorite } = request.query as {
        project_uuid?: string;
        page?: string | number;
        pageSize?: string | number;
        favorite?: string | number | boolean;
      };

      if (!project_uuid || !project_uuid.trim()) {
        return reply.code(400).send({ error: 'project_uuid is required' });
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const pageSizeNum = Math.max(1, Math.min(100, Number(pageSize) || 50));

      const userId = getUserIdFromRequest(request);
      const favOnly = String(favorite ?? '').toLowerCase();
      const favFilter = favOnly === 'true' || favOnly === '1';

      let whereCond = and(eq(historyTable.project_uuid, project_uuid), eq(historyTable.user_id, userId));
      if (favFilter) whereCond = and(whereCond, eq(historyTable.favorite, true));

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)` })
        .from(historyTable)
        .where(whereCond);

      return reply.send({ total, page: pageNum, pageSize: pageSizeNum });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to load history meta' });
    }
  });

  // Mark/unmark favorite
  fastify.patch('/api/history/:uuid/favorite', async (request, reply) => {
    try {
      const { uuid } = request.params as { uuid: string };
      const { favorite } = request.body as { favorite?: boolean };
      if (!uuid || !uuid.trim()) return reply.code(400).send({ error: 'uuid is required' });
      if (typeof favorite !== 'boolean') return reply.code(400).send({ error: 'favorite is required (boolean)' });
      const userId = getUserIdFromRequest(request);
      const rows = await db
        .select()
        .from(historyTable)
        .where(and(eq(historyTable.uuid, uuid), eq(historyTable.user_id, userId)))
        .limit(1);
      if (!rows.length) return reply.code(404).send({ error: 'History entry not found' });
      await db
        .update(historyTable)
        .set({ favorite })
        .where(and(eq(historyTable.uuid, uuid), eq(historyTable.user_id, userId)));
      return reply.send({ ok: true, favorite });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to update favorite flag' });
    }
  });

  fastify.post('/api/history/move', async (request, reply) => {
    try {
      const { entryUuids, targetProjectUuid } = request.body as { entryUuids?: string[]; targetProjectUuid?: string };
      if (!Array.isArray(entryUuids) || !entryUuids.length) {
        return reply.code(400).send({ error: 'entryUuids must be a non-empty array' });
      }
      const normalizedTarget = targetProjectUuid?.trim();
      if (!normalizedTarget) {
        return reply.code(400).send({ error: 'targetProjectUuid is required' });
      }

      const uniqueEntryUuids = Array.from(new Set(entryUuids.map((id) => (typeof id === 'string' ? id.trim() : '')).filter(Boolean)));
      if (!uniqueEntryUuids.length) {
        return reply.code(400).send({ error: 'entryUuids must contain valid ids' });
      }

      const userId = getUserIdFromRequest(request);
      const targetProjects = await db
        .select({ uuid: projectsTable.uuid })
        .from(projectsTable)
        .where(and(eq(projectsTable.uuid, normalizedTarget), eq(projectsTable.user_id, userId)))
        .limit(1);
      if (!targetProjects.length) {
        return reply.code(404).send({ error: 'Target project not found' });
      }

      const entries = await db
        .select()
        .from(historyTable)
        .where(and(eq(historyTable.user_id, userId), inArray(historyTable.uuid, uniqueEntryUuids)));

      if (!entries.length) {
        return reply.code(404).send({ error: 'History entries not found' });
      }

      if (entries.length !== uniqueEntryUuids.length) {
        const missing = uniqueEntryUuids.filter((uuid) => !entries.some((entry) => entry.uuid === uuid));
        return reply.code(404).send({ error: `Entries not found: ${missing.join(', ')}` });
      }

      const destinationDir = path.resolve(GENERATED_DIR, normalizedTarget);
      await fsPromises.mkdir(destinationDir, { recursive: true });

      let movedCount = 0;

      for (const entry of entries) {
        let nextImageName = entry.image_name;
        if (entry.project_uuid !== normalizedTarget) {
          const sourcePath = path.resolve(GENERATED_DIR, entry.project_uuid, entry.image_name);
          const sourceExists = await fileExists(sourcePath);
          if (sourceExists) {
            const { fileName, filePath } = await ensureUniqueDestination(destinationDir, entry.image_name);
            await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
            await fsPromises.rename(sourcePath, filePath);
            nextImageName = fileName;
          } else {
            fastify.log.warn({ entryUuid: entry.uuid, sourcePath }, 'Source file missing while moving history entry');
          }
        }

        await db
          .update(historyTable)
          .set({ project_uuid: normalizedTarget, image_name: nextImageName })
          .where(and(eq(historyTable.uuid, entry.uuid), eq(historyTable.user_id, userId)));
        movedCount += 1;
      }

      return reply.send({ ok: true, moved: movedCount });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to move history entries' });
    }
  });

  // Delete a history entry and associated file
  fastify.delete('/api/history/:uuid', async (request, reply) => {
    try {
      const { uuid } = request.params as { uuid: string };
      if (!uuid || !uuid.trim()) return reply.code(400).send({ error: 'uuid is required' });
      const userId = getUserIdFromRequest(request);
      const rows = await db
        .select()
        .from(historyTable)
        .where(and(eq(historyTable.uuid, uuid), eq(historyTable.user_id, userId)))
        .limit(1);
      if (!rows.length) return reply.code(404).send({ error: 'History entry not found' });
      const entry = rows[0];
      // Construct file path from project_uuid and image_name
      if (entry.image_name) {
        const filePath = path.resolve(GENERATED_DIR, entry.project_uuid, entry.image_name);
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {
          fastify.log.warn({ err: e }, 'Failed to delete image file');
        }
      }
      await db.delete(historyTable).where(and(eq(historyTable.uuid, uuid), eq(historyTable.user_id, userId)));
      return reply.send({ ok: true });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to delete history entry' });
    }
  });
}
