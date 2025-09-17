import type { FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { v4 } from 'uuid';
import { db } from '../db/sqlite/client';
import { historyTable, projectsTable } from '../db/sqlite/schema';
import { and, eq } from 'drizzle-orm';
import { API_KEY, GENERATED_DIR } from '../config';
import { generateImageBinary } from '../services/generation';
import { getUserIdFromRequest } from '../utils/getUserId';

type GenerateImageRequest = {
  prompt: string;
  model: string;
  width?: number;
  height?: number;
  resolution?: string; // alternative to width/height like "1024x1024"
  negative_prompt?: string;
  nImages?: number; // optional, default 1
  num_steps?: number;
  sampler_name?: string;
  scale?: number;
  imageDataUrl?: string; // base image/reference
  kontext_max_mode?: boolean;
  // New minimal fields to support API-2
  seed?: number;
  response_format?: 'b64_json' | 'url';
  provider?: 'api1' | 'api2';
  imageDataUrls?: string[];
  maskDataUrl?: string;
  project_uuid: string;
};

export default async function generateRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => fastify.authenticate(request, reply));
  fastify.post('/api/generate-image', async (request, reply) => {
    try {
      const body = request.body as Partial<GenerateImageRequest>;

      if (!body?.prompt || !body.prompt.trim()) return reply.code(400).send({ error: 'prompt is required' });
      if (!body?.model || !body.model.trim()) return reply.code(400).send({ error: 'model is required' });
      if (!body?.project_uuid || !body.project_uuid.trim()) return reply.code(400).send({ error: 'project_uuid is required' });

      // Resolve width/height
      let width = body.width;
      let height = body.height;
      if ((!width || !height) && body.resolution) {
        const [w, h] = String(body.resolution).split('x');
        const parsedW = Number(w);
        const parsedH = Number(h);
        if (!Number.isNaN(parsedW) && !Number.isNaN(parsedH)) {
          width = parsedW; height = parsedH;
        }
      }
      if (!width || !height) return reply.code(400).send({ error: 'width and height (or resolution) are required' });

      const apiKey = API_KEY;
      if (!apiKey) return reply.code(500).send({ error: 'Missing API_KEY in environment' });

      const provider = body.provider ?? 'api1';
      const payload: Record<string, any> = { prompt: body.prompt, model: body.model };

      if (provider === 'api2') {
        // Map to API-2 (OpenAI-like) fields
        const sizeStr = body.resolution ?? (typeof width === 'number' && typeof height === 'number' ? `${width}x${height}` : undefined);
        if (sizeStr) payload.size = sizeStr;
        if (typeof body.nImages === 'number') payload.n = body.nImages;
        if (typeof body.num_steps === 'number') payload.num_inference_steps = body.num_steps;
        if (typeof body.scale === 'number') payload.guidance_scale = body.scale;
        if (body.response_format) payload.response_format = body.response_format; else payload.response_format = 'b64_json';
        if (typeof body.seed === 'number') payload.seed = body.seed;
        if (body.imageDataUrl) payload.imageDataUrl = body.imageDataUrl;
        if (body.imageDataUrls) payload.imageDataUrls = body.imageDataUrls;
        if (body.maskDataUrl) payload.maskDataUrl = body.maskDataUrl;
        if (typeof body.kontext_max_mode === 'boolean') payload.kontext_max_mode = body.kontext_max_mode;
      } else {
        // Default API-1 mapping
        if (typeof width === 'number') payload.width = width;
        if (typeof height === 'number') payload.height = height;
        if (body.negative_prompt) payload.negative_prompt = body.negative_prompt;
        if (typeof body.nImages === 'number') payload.nImages = body.nImages;
        if (typeof body.num_steps === 'number') payload.num_steps = body.num_steps;
        if (body.resolution) payload.resolution = body.resolution;
        if (body.sampler_name) payload.sampler_name = body.sampler_name;
        if (typeof body.scale === 'number') payload.scale = body.scale;
        if (body.imageDataUrl) payload.imageDataUrl = body.imageDataUrl;
        if (typeof body.kontext_max_mode === 'boolean') payload.kontext_max_mode = body.kontext_max_mode;
        if (typeof body.seed === 'number') payload.seed = body.seed;
      }

      // Ensure project exists and belongs to the current user
      const userId = getUserIdFromRequest(request);
      const projectRows = await db
        .select({ uuid: projectsTable.uuid })
        .from(projectsTable)
        .where(and(eq(projectsTable.uuid, body.project_uuid!), eq(projectsTable.user_id, userId)))
        .limit(1);
      if (!projectRows.length) return reply.code(404).send({ error: 'Project not found' });

      const { imageData, contentType, extension, apiData } = await generateImageBinary(payload, {
        apiKey,
        provider,
      });

      // Save file under project folder, but store only filename in DB
      const fileName = `image-${crypto.randomUUID()}.${extension}`;
      const projectDir = path.resolve(GENERATED_DIR, body.project_uuid!);
      const outPath = path.resolve(projectDir, fileName);
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(outPath, imageData);

      // Persist history
      await db.insert(historyTable).values({
        uuid: v4(),
        create_date: new Date(),
        model: body.model!,
        image_name: fileName,
        prompt: body.prompt!,
        width,
        height,
        negative_prompt: body.negative_prompt,
        n_images: body.nImages,
        num_steps: body.num_steps,
        resolution: body.resolution,
        sampler_name: body.sampler_name,
        scale: body.scale,
        image_data_url: body.imageDataUrl,
        provider,
        response_format: body.response_format ?? (provider === 'api2' ? 'b64_json' : null),
        seed: body.seed,
        kontext_max_mode: body.kontext_max_mode ?? false,
        favorite: false,
        user_id: userId,
        project_uuid: body.project_uuid!,
      });

      return reply.send(apiData);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Image generation failed' });
    }
  });
}
