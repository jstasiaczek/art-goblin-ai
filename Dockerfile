# Multi-stage build for frontend and backend

FROM node:20-alpine AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

# Build frontend
FROM base AS frontend-builder
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/frontend/package.json apps/frontend/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store pnpm -C apps/frontend install
COPY apps/frontend apps/frontend
RUN pnpm -C apps/frontend build

# Build backend
FROM base AS backend-builder
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store pnpm -C apps/backend install
COPY apps/backend apps/backend
RUN pnpm -C apps/backend build

# Runtime image
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Copy backend build output and node_modules from builder
COPY --from=backend-builder /app/apps/backend/dist apps/backend/dist
COPY --from=backend-builder /app/apps/backend/node_modules apps/backend/node_modules
COPY --from=backend-builder /app/node_modules /app/node_modules
COPY --from=backend-builder /app/apps/backend/package.json apps/backend/package.json
COPY --from=backend-builder /app/apps/backend/src apps/backend/src
COPY --from=backend-builder /app/apps/backend/drizzle.config.ts apps/backend/drizzle.config.ts
COPY --from=backend-builder /app/apps/backend/drizzle apps/backend/drizzle
COPY --from=backend-builder /app/apps/backend/scripts apps/backend/scripts
COPY --from=backend-builder /app/apps/backend/src/models.json apps/backend/dist/src/

# Copy frontend build into backend public dir
COPY --from=frontend-builder /app/apps/frontend/dist apps/backend/dist/public

EXPOSE 3000
WORKDIR /app/apps/backend
CMD ["node", "dist/src/index.js"]
