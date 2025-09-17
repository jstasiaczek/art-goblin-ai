import type { FastifyInstance } from 'fastify';
import { db } from '../db/sqlite/client';
import { usersTable } from '../db/sqlite/schema';
import { eq } from 'drizzle-orm';
import { verify as verifyHash, hash as hashPassword } from 'argon2';
import { getUserIdFromRequest } from '../utils/getUserId';
import { setSessionCookie } from '../session';

type ChangePasswordBody = { currentPassword?: string; newPassword?: string };

export default async function accountRoutes(fastify: FastifyInstance) {
  // Require auth for all routes here
  fastify.addHook('preHandler', async (request, reply) => fastify.authenticate(request, reply));

  // Change own password
  fastify.put('/api/me/password', async (request, reply) => {
    try {
      const { currentPassword, newPassword } = request.body as ChangePasswordBody;
      if (!currentPassword) return reply.code(400).send({ error: 'currentPassword is required' });
      if (!newPassword) return reply.code(400).send({ error: 'newPassword is required' });
      if (newPassword.length < 8) return reply.code(400).send({ error: 'newPassword must be at least 8 characters' });
      const userId = getUserIdFromRequest(request);
      const rows = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      if (!rows.length) return reply.code(404).send({ error: 'User not found' });
      const user = rows[0];

      const ok = await verifyHash(user.password, currentPassword);
      if (!ok) return reply.code(400).send({ error: 'current password is incorrect' });
      if (await verifyHash(user.password, newPassword).catch(() => false)) {
        // If newPassword hashed equals existing hash (rare path) or same password
        return reply.code(400).send({ error: 'new password must differ from current password' });
      }

      const hashed = await hashPassword(newPassword);
      await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, userId));

      // Issue fresh JWT and set cookie
      setSessionCookie(fastify, reply, {
        sub: user.id,
        email: user.email,
        username: user.email,
        role: user.role === 'admin' ? 'admin' : 'user',
      });
      return reply.send({ ok: true });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to change password' });
    }
  });
}
