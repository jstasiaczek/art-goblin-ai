import type { FastifyInstance } from 'fastify';
import type { FastifyReply } from 'fastify/types/reply';
import { COOKIE_SECURE } from './config';

export type SessionPayload = {
  sub: number;
  email?: string;
  username?: string;
  role?: 'admin' | 'user';
};

export const SESSION_EXPIRATION_SECONDS = 60 * 60 * 6;

const buildSessionPayload = (payload: SessionPayload) => ({
  sub: payload.sub,
  email: payload.email ?? payload.username,
  username: payload.username ?? payload.email,
  role: payload.role === 'admin' ? 'admin' : 'user',
});

const buildCookieOptions = () => ({
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_EXPIRATION_SECONDS,
});

export const setSessionCookie = (fastify: FastifyInstance, reply: FastifyReply, payload: SessionPayload) => {
  const normalized = buildSessionPayload(payload);
  const token = fastify.jwt.sign(normalized, { expiresIn: SESSION_EXPIRATION_SECONDS });
  reply.setCookie('token', token, buildCookieOptions());
};

export const shouldRefreshToken = (user: Partial<SessionPayload> & { exp?: number }) => {
  if (!user.exp) return true;
  const secondsRemaining = user.exp - Math.floor(Date.now() / 1000);
  return secondsRemaining <= SESSION_EXPIRATION_SECONDS / 2;
};
