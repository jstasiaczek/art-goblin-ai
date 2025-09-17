import type { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { db } from '../db/sqlite/client';
import { modelsTable, usersTable } from '../db/sqlite/schema';
import { sql, eq } from 'drizzle-orm';
import { hash } from 'argon2';
import { v4 } from 'uuid';
import { setSessionCookie } from '../session';

type SetupBody = { email?: string; password?: string };

export default async function setupRoutes(fastify: FastifyInstance) {
  fastify.get('/api/setup/status', async (_request, reply) => {
    const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(usersTable);
    return reply.send({ needsSetup: total === 0 });
  });

  fastify.post('/api/setup/admin', async (request, reply) => {
    try {
      const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(usersTable);
      if (total > 0) {
        return reply.code(409).send({ error: 'setup already completed' });
      }

      const { email, password } = request.body as SetupBody;
      if (!email || !email.trim()) return reply.code(400).send({ error: 'email is required' });
      if (!password || password.length < 8) {
        return reply.code(400).send({ error: 'password must be at least 8 characters' });
      }

      const trimmedEmail = email.trim();
      const hashed = await hash(password);

      await db.insert(usersTable).values({
        email: trimmedEmail,
        uuid: v4(),
        password: hashed,
        role: 'admin',
      });

      const [created] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, trimmedEmail))
        .limit(1);

      if (!created?.id) {
        return reply.code(500).send({ error: 'Failed to create admin user' });
      }

      await importInitialModels();

      setSessionCookie(fastify, reply, {
        sub: created.id,
        email: created.email,
        username: created.email,
        role: 'admin',
      });

      return reply.code(201).send({ ok: true });
    } catch (err: any) {
      if (String(err?.message || '').includes('UNIQUE')) {
        return reply.code(409).send({ error: 'email already exists' });
      }
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to complete setup' });
    }
  });
}

async function importInitialModels() {
  const modelsPath = await resolveModelsPath();
  const data = await fs.readFile(modelsPath, 'utf-8');
  const parsed = JSON.parse(data) as { id?: unknown; name?: unknown; sizes?: unknown }[];

  console.log(parsed.length ? `Importing ${parsed.length} models...` : 'No models to import');

  await db.delete(modelsTable);

  const rows: { id: string; name: string; sizes: string }[] = [];
  for (const [index, model] of parsed.entries()) {
    if (!model || typeof model !== 'object') {
      throw new Error(`Invalid model entry at index ${index}`);
    }
    const id = typeof model.id === 'string' && model.id.trim() ? model.id.trim() : null;
    const name = typeof model.name === 'string' && model.name.trim() ? model.name.trim() : null;
    if (!id || !name) {
      throw new Error(`Model at index ${index} is missing id or name`);
    }
    if (!Array.isArray(model.sizes) || !model.sizes.length) {
      throw new Error(`Model ${id} must define at least one size`);
    }
    rows.push({ id, name, sizes: JSON.stringify(model.sizes) });
  }

  if (rows.length) {
    await db.insert(modelsTable).values(rows);
  }
}

async function resolveModelsPath(): Promise<string> {
  const candidates = [
    path.resolve(__dirname, '../models.json'),
    path.resolve(process.cwd(), 'apps/backend/src/models.json'),
    path.resolve(process.cwd(), 'src/models.json'),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch (_err) {
      // try next candidate
    }
  }

  throw new Error('models.json file not found');
}
