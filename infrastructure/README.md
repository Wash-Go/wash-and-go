# Infrastructure

Local dev + CI runtime dependencies. Production hosting deferred (PLAN.md §1.11 — leaning DigitalOcean/self-hosted; no Render, no Neon).

```sh
docker compose -f infrastructure/docker-compose.yml up -d
# Postgres: postgres://dev:dev@localhost:5433/wash_and_go
# Redis:    redis://localhost:6380
```
