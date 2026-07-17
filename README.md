# Wash & Go

Scheduling-first laundry marketplace for Zamboanga City. Dual-service logistics: Express (point-to-point courier) + Scheduled (Piaggio batch runs). The platform is the coordination layer — partner shops wash, riders move, we orchestrate.

## Monorepo layout

```
apps/
  api/               NestJS + Fastify + Prisma (modular monolith, ADR-003 slice)
  landing-page/      Public onboarding site — TanStack Start (SSR)
  laundry-portal/    Shop web app — weigh entry, statuses (TanStack SPA)
  admin-dashboard/   Ops console — placeholder, built Phase 4+
  customer-mobile/   React Native/Expo — placeholder until MVP Sat
  rider-mobile/      React Native/Expo — placeholder (stretch goal)
packages/
  api-client/        OpenAPI-generated TS client
  domain/            Shared value objects + validation
  ui/                Design tokens + web/native component sets
  maps/              MapsProvider boundary (vendor D10 pending)
infrastructure/      docker-compose (Postgres 16 + Redis 7), deploy configs
```

## Quick start

```sh
corepack enable && pnpm install
docker compose -f infrastructure/docker-compose.yml up -d
pnpm dev:landing   # :3000
pnpm dev:api       # :4000 (Swagger at /api-docs)
pnpm dev:portal    # :3002
```

Node ≥ 22.13. pnpm ≥ 9 (`node-linker=hoisted` for Metro compatibility).

## Source of truth

Decisions: `docs/startup-grind/05-decisions/` (ADRs) → `PLAN.md` → `docs/spec.md`. AI contributors: read `AGENTS.md` first. 2026-07-17 debate decisions are PENDING CEO APPROVAL — see PLAN.md §0.
