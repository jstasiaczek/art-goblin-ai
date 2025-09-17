import type { FastifyInstance } from 'fastify';
import { db } from '../db/sqlite/client';
import { modelsTable } from '../db/sqlite/schema';

type ModelSize = {
  width: number;
  height: number;
  price: string;
  maxImages: string;
};

type ModelInfo = {
  name: string;
  id: string;
  sizes: ModelSize[];
};

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

const isFinitePositiveInt = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0;

const sanitizeModelSize = (value: unknown, modelLabel: string, index: number): ValidationResult<ModelSize> => {
  if (!value || typeof value !== 'object') {
    return { ok: false, error: `${modelLabel}: item ${index + 1} in "sizes" must be an object` };
  }
  const maybe = value as Record<string, unknown>;
  const width = maybe.width;
  const height = maybe.height;
  const price = maybe.price;
  const maxImages = maybe.maxImages;
  if (!isFinitePositiveInt(width)) {
    return { ok: false, error: `${modelLabel}: field "width" in size ${index + 1} must be a positive integer` };
  }
  if (!isFinitePositiveInt(height)) {
    return { ok: false, error: `${modelLabel}: field "height" in size ${index + 1} must be a positive integer` };
  }
  if (typeof price !== 'string' || !price.trim()) {
    return { ok: false, error: `${modelLabel}: field "price" in size ${index + 1} must be a non-empty string` };
  }
  if ((typeof maxImages !== 'string' || !maxImages.trim()) && !isFinitePositiveInt(maxImages)) {
    return { ok: false, error: `${modelLabel}: field "maxImages" in size ${index + 1} must be a positive number or a non-empty string` };
  }
  return {
    ok: true,
    value: {
      width: Number(width),
      height: Number(height),
      price: price.trim(),
      maxImages: typeof maxImages === 'string' ? maxImages.trim() : String(Number(maxImages)),
    },
  };
};

const sanitizeModel = (value: unknown, index: number): ValidationResult<ModelInfo> => {
  if (!value || typeof value !== 'object') {
    return { ok: false, error: `Model ${index + 1} must be an object` };
  }
  const maybe = value as Record<string, unknown>;
  const rawId = maybe.id;
  const rawName = maybe.name;
  const id = typeof rawId === 'string' ? rawId.trim() : '';
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  if (!id) {
    return { ok: false, error: `Model ${index + 1}: field "id" is required` };
  }
  if (!name) {
    return { ok: false, error: `Model ${index + 1}: field "name" is required` };
  }
  const sizesRaw = Array.isArray(maybe.sizes) ? maybe.sizes : null;
  if (!sizesRaw) {
    return { ok: false, error: `Model ${id}: field "sizes" must be an array` };
  }
  if (!sizesRaw.length) {
    return { ok: false, error: `Model ${id}: "sizes" array cannot be empty` };
  }
  const sizes: ModelSize[] = [];
  for (let i = 0; i < sizesRaw.length; i += 1) {
    const result = sanitizeModelSize(sizesRaw[i], `Model ${id}`, i);
    if (!result.ok) return result;
    sizes.push(result.value);
  }
  return { ok: true, value: { id, name, sizes } };
};

export default async function modelsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/models', async (_request, reply) => {
    try {
      const rows = await db.select().from(modelsTable);
      return reply.send(rows.map((model) => ({
        id: model.id,
        name: model.name,
        sizes: JSON.parse(model.sizes) as ModelSize[],
      } as ModelInfo)));
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to load models from database' });
    }
  });

  fastify.post('/api/models/import', {
    preHandler: async (request, reply) => {
      await fastify.authenticate(request, reply);
      await fastify.authorizeAdmin(request, reply);
    },
  }, async (request, reply) => {
    try {
      const file = await request.file();
      if (!file) {
        return reply.code(400).send({ error: 'Model file is required' });
      }

      const buffer = await file.toBuffer();
      let parsed: unknown;
      try {
        parsed = JSON.parse(buffer.toString('utf-8'));
      } catch (_err) {
        return reply.code(400).send({ error: 'Uploaded file does not contain valid JSON' });
      }

      if (!Array.isArray(parsed)) {
        return reply.code(400).send({ error: 'File structure must be a list of models' });
      }

      const models: ModelInfo[] = [];
      const usedIds = new Set<string>();
      for (let i = 0; i < parsed.length; i += 1) {
        const sanitized = sanitizeModel(parsed[i], i);
        if (!sanitized.ok) {
          return reply.code(400).send({ error: sanitized.error });
        }
        if (usedIds.has(sanitized.value.id)) {
          return reply.code(400).send({ error: `Duplicate model identifier: ${sanitized.value.id}` });
        }
        usedIds.add(sanitized.value.id);
        models.push(sanitized.value);
      }

      await db.delete(modelsTable);
      if (models.length) {
        await db.insert(modelsTable).values(
          models.map((model) => ({
            id: model.id,
            name: model.name,
            sizes: JSON.stringify(model.sizes),
          })),
        );
      }

      return reply.code(201).send({ ok: true, count: models.length });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to import models' });
    }
  });
}
