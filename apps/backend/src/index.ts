import Fastify from 'fastify';
import 'dotenv/config';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { PORT, JWT_SECRET } from './config';
import { db } from './db/sqlite/client';
import { usersTable } from './db/sqlite/schema';
import { eq } from 'drizzle-orm';
import { verify as verifyHash } from 'argon2';
import filesRoutes from './routes/files';
import generateRoutes from './routes/generate';
import historyRoutes from './routes/history';
import projectsRoutes from './routes/projects';
import projectGroupsRoutes from './routes/project-groups';
import snippetsRoutes from './routes/snippets';
import modelsRoutes from './routes/models';
import usersRoutes from './routes/users';
import accountRoutes from './routes/account';
import { FastifyRequest } from 'fastify/types/request';
import { FastifyReply } from 'fastify/types/reply';
import setupRoutes from './routes/setup';
import { setSessionCookie, shouldRefreshToken, type SessionPayload } from './session';

const TEST_FILE_NAME = 'image-0b9a3f58-4b35-4b48-ba06-752b44fdf77c.png';

const fastify = Fastify({ logger: true });

// Register cookie and JWT plugins
fastify.register(fastifyCookie);
fastify.register(fastifyJwt, {
  secret: JWT_SECRET,
  cookie: {
    cookieName: 'token',
    signed: false,
  },
});
fastify.register(fastifyMultipart);

// Register file serving routes
fastify.register(filesRoutes);
fastify.register(modelsRoutes);
fastify.register(setupRoutes);
// Root-level auth: decorate authenticate using JWT cookie
fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify({ onlyCookie: true });
    const jwtUser = request.user as SessionPayload & { exp?: number };
    if (jwtUser && shouldRefreshToken(jwtUser)) {
      setSessionCookie(fastify, reply, jwtUser);
    }
  } catch (_e) {
    return reply.code(401).send({ error: 'unauthorized' });
  }
});

// Admin authorization guard
fastify.decorate('authorizeAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as AuthUser;
  if (!user || user.role !== 'admin') {
    return reply.code(403).send({ error: 'forbidden' });
  }
});

fastify.post('/api/login', async (request, reply) => {
  const { email, password } = request.body as { email?: string; password?: string };
  if (!email || !email.trim()) return reply.code(400).send({ error: 'email is required' });
  if (!password) return reply.code(400).send({ error: 'password is required' });
  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email.trim()));
  if (!rows.length) return reply.code(401).send({ error: 'invalid credentials' });
  const user = rows[0];
  const ok = await verifyHash(user.password, password);
  if (!ok) return reply.code(401).send({ error: 'invalid credentials' });
  setSessionCookie(fastify, reply, {
    sub: user.id,
    email: user.email,
    username: user.email,
    role: user.role === 'admin' ? 'admin' : 'user',
  });
  return reply.send({ ok: true });
});

fastify.post('/api/logout', async (_request, reply) => {
  reply.clearCookie('token', { path: '/' });
  return reply.send({ ok: true });
});

fastify.get('/api/me', { preHandler: (req, rep) => fastify.authenticate(req, rep) }, async (request, reply) => {
  // request.user is populated by @fastify/jwt
  const user = (request.user || {}) as AuthUser;
  const id = user.sub;
  const email = user.email ?? user.username;
  const username = user.username ?? user.email;

  const foundUser = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);

  if (!id || (!email && !username) || !foundUser.length) {
    return reply.code(404).send({ error: 'user not found' });
  }

  return reply.send({ id, email: email ?? username, username: username ?? email, role: user.role ?? 'user' });
});
fastify.register(historyRoutes);
fastify.register(projectsRoutes);
fastify.register(projectGroupsRoutes);
fastify.register(snippetsRoutes);
fastify.register(usersRoutes);
fastify.register(accountRoutes);
fastify.register(generateRoutes);

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server ready at http://0.0.0.0:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
// Serve frontend static (built files copied to dist/public)
fastify.register(fastifyStatic, {
  root: path.resolve(__dirname, '../public'),
  prefix: '/',
  // leave decorateReply as default (true) to enable reply.sendFile
});

// SPA fallback via notFound handler for non-API routes
fastify.setNotFoundHandler(async (request, reply) => {
  const url = request.url || '';
  if (url.startsWith('/api')) {
    return reply.code(404).send({ error: 'Not Found' });
  }
  return reply.sendFile('index.html');
});
