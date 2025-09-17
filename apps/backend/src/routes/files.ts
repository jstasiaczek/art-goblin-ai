import type { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { GENERATED_DIR } from '../config';
import { db } from '../db/sqlite/client';
import { historyTable } from '../db/sqlite/schema';
import { eq, and } from 'drizzle-orm';
import { get } from 'http';
import { getUserIdFromRequest } from '../utils/getUserId';

export default async function filesRoutes(fastify: FastifyInstance) {
  // Protect access to generated files – only owner can fetch
  fastify.addHook('preHandler', async (request, reply) => fastify.authenticate(request, reply));
  fastify.get('/api/generated/:file', async (request, reply) => {
    try {
      const { file } = request.params as { file: string };
      if (!file || file.includes('..') || file.includes('/') || file.includes('\\')) {
        return reply.code(400).send({ error: 'Invalid file name' });
      }
      const userId = getUserIdFromRequest(request);
      // Lookup project folder by image_name in history
      const rows = await db
        .select({ project_uuid: historyTable.project_uuid })
        .from(historyTable)
        .where(and(eq(historyTable.image_name, file), eq(historyTable.user_id, userId)))
        .limit(1);
      if (!rows.length) {
        return reply.code(404).send({ error: 'File not found' });
      }
      const projectUuid = rows[0].project_uuid;
      const filePath = path.resolve(GENERATED_DIR, projectUuid, file);
      if (!fs.existsSync(filePath)) {
        return reply.code(404).send({ error: 'File not found' });
      }
      const ext = path.extname(file).toLowerCase();
      const contentType =
        ext === '.png' ? 'image/png' :
        ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
        ext === '.webp' ? 'image/webp' :
        'application/octet-stream';

      reply.header('Content-Type', contentType);
      const stream = fs.createReadStream(filePath);
      return reply.send(stream);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to serve file' });
    }
  });
}
