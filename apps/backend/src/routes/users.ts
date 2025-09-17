import type { FastifyInstance } from 'fastify';
import { db } from '../db/sqlite/client';
import { usersTable } from '../db/sqlite/schema';
import { eq } from 'drizzle-orm';
import { v4 } from 'uuid';
import { hash } from 'argon2';

type CreateUserBody = { email: string; password: string; role?: 'admin' | 'user' };
type UpdateUserBody = { email?: string; password?: string; role?: 'admin' | 'user' };

function sanitizeUser(u: DbUser) {
  const { password, ...rest } = u;
  return rest;
}

export default async function usersRoutes(fastify: FastifyInstance) {
  // Admin-only guard for all routes in this plugin
  fastify.addHook('preHandler', async (request, reply) => fastify.authenticate(request, reply));
  fastify.addHook('preHandler', async (request, reply) => fastify.authorizeAdmin(request, reply));

  // List users
  fastify.get('/api/users', async (_request, reply) => {
    try {
      const rows: DbUser[] = await db.select().from(usersTable);
      return reply.send(rows.map(sanitizeUser));
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to list users' });
    }
  });

  // Get user by id
  fastify.get('/api/users/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const uid = Number(id);
      const rows = await db.select().from(usersTable).where(eq(usersTable.id, uid));
      if (!rows.length) return reply.code(404).send({ error: 'User not found' });
      return reply.send(sanitizeUser(rows[0]));
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch user' });
    }
  });

  // Create user
  fastify.post('/api/users', async (request, reply) => {
    try {
      const { email, password, role } = request.body as CreateUserBody;
      if (!email || !email.trim()) return reply.code(400).send({ error: 'email is required' });
      if (!password) return reply.code(400).send({ error: 'password is required' });
      const hashed = await hash(password);
      const values: DbUser = { email: email.trim(), uuid: v4(), password: hashed };
      if (role) values.role = role;
      await db.insert(usersTable).values(values);
      const [created] = await db.select().from(usersTable).where(eq(usersTable.email, email.trim()));
      return reply.code(201).send(sanitizeUser(created));
    } catch (err: any) {
      if (String(err?.message || '').includes('UNIQUE')) {
        return reply.code(409).send({ error: 'email already exists' });
      }
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to create user' });
    }
  });

  // Update user
  fastify.put('/api/users/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const uid = Number(id);
      const { email, password, role } = request.body as UpdateUserBody;
      const patch: any = {};
      if (email && email.trim()) patch.email = email.trim();
      if (role) patch.role = role;
      if (password) {
        patch.password = await hash(password);
      }
      if (Object.keys(patch).length === 0) return reply.code(400).send({ error: 'No fields to update' });
      await db.update(usersTable).set(patch).where(eq(usersTable.id, uid));
      const rows = await db.select().from(usersTable).where(eq(usersTable.id, uid));
      if (!rows.length) return reply.code(404).send({ error: 'User not found' });
      return reply.send(sanitizeUser(rows[0]));
    } catch (err: any) {
      if (String(err?.message || '').includes('UNIQUE')) {
        return reply.code(409).send({ error: 'email already exists' });
      }
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to update user' });
    }
  });

  // Delete user
  fastify.delete('/api/users/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const uid = Number(id);
      await db.delete(usersTable).where(eq(usersTable.id, uid));
      return reply.send({ ok: true });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to delete user' });
    }
  });
}

