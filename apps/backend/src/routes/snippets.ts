import type { FastifyInstance } from 'fastify';
import { and, desc, eq, like, or } from 'drizzle-orm';
import { v4 } from 'uuid';
import { db } from '../db/sqlite/client';
import { snippetsTable } from '../db/sqlite/schema';
import { getUserIdFromRequest } from '../utils/getUserId';

const normalizeSearch = (value?: string) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return `%${trimmed.replace(/%/g, '').replace(/_/g, '')}%`;
};

export default async function snippetsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => fastify.authenticate(request, reply));

  fastify.get('/api/snippets', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { q } = request.query as { q?: string };
      const search = normalizeSearch(q);

      const where = search
        ? and(
            eq(snippetsTable.user_id, userId),
            or(
              like(snippetsTable.title, search),
              like(snippetsTable.snippet, search),
            ),
          )
        : eq(snippetsTable.user_id, userId);

      const snippets = await db
        .select()
        .from(snippetsTable)
        .where(where)
        .orderBy(desc(snippetsTable.created_at), desc(snippetsTable.id));

      return reply.send(snippets);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to list snippets' });
    }
  });

  fastify.post('/api/snippets', async (request, reply) => {
    try {
      const { title, snippet } = request.body as { title?: string; snippet?: string };
      if (!snippet || !snippet.trim()) {
        return reply.code(400).send({ error: 'Snippet content is required' });
      }
      const userId = getUserIdFromRequest(request);
      const uuid = v4();
      const now = Date.now();
      await db.insert(snippetsTable).values({
        uuid,
        user_id: userId,
        title: title?.trim() || null,
        snippet: snippet.trim(),
        created_at: Math.floor(now / 1000),
      });
      const created = await db
        .select()
        .from(snippetsTable)
        .where(and(eq(snippetsTable.uuid, uuid), eq(snippetsTable.user_id, userId)))
        .limit(1);
      return reply.code(201).send(created[0]);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to create snippet' });
    }
  });

  fastify.delete('/api/snippets/:uuid', async (request, reply) => {
    try {
      const { uuid } = request.params as { uuid: string };
      const userId = getUserIdFromRequest(request);
      const existing = await db
        .select()
        .from(snippetsTable)
        .where(and(eq(snippetsTable.uuid, uuid), eq(snippetsTable.user_id, userId)))
        .limit(1);

      if (!existing.length) {
        return reply.code(404).send({ error: 'Snippet not found' });
      }

      await db
        .delete(snippetsTable)
        .where(and(eq(snippetsTable.uuid, uuid), eq(snippetsTable.user_id, userId)));

      return reply.send({ ok: true });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to delete snippet' });
    }
  });
}
