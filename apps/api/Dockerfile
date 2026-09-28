# Build context = repo root. On Railway: set the Dockerfile path to
# apps/api/Dockerfile and leave the root directory at the repo root.
#
# Multi-stage: install workspace deps → build the API → slim runtime that runs
# migrations then boots. Prisma's debian engine is baked in (see schema
# binaryTargets).

FROM node:22-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

# --- deps: install with the lockfile (cached unless manifests change) ---
FROM base AS deps
# .npmrc carries node-linker=hoisted — without it pnpm won't hoist transitive
# deps (fastify etc.) and the API's phantom imports fail to resolve.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY packages/maps/package.json packages/maps/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN pnpm install --frozen-lockfile

# --- build: generate Prisma client + compile the API ---
FROM deps AS build
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @wash-and-go/api exec prisma generate
RUN pnpm --filter @wash-and-go/api build

# --- runtime ---
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
WORKDIR /app/apps/api
EXPOSE 4000
# Apply pending migrations, then start. Railway injects PORT + env at runtime.
CMD ["sh", "-c", "pnpm run prisma:migrate:deploy && node dist/src/main.js"]
