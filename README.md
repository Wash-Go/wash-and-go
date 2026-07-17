# Wash & Go

Wash & Go is a scheduling-first laundry marketplace for Zamboanga City and a
DOST AZUL Hub startup. This repository is the source of truth for product code,
architecture decisions, engineering documentation, and AI-assisted development
workflows.

## Repository status

- Canonical remote: `https://github.com/Wash-Go/wash-and-go.git`
- Default branch: `main`
- Product plan: [`PLAN.md`](./PLAN.md)
- Product specification: [`docs/spec.md`](./docs/spec.md)
- Engineering documentation: [`docs/startup-grind/README.md`](./docs/startup-grind/README.md)
- Proposed business rules in plain language:
  [`docs/startup-grind/01-product/BUSINESS_RULES_PROPOSED.md`](./docs/startup-grind/01-product/BUSINESS_RULES_PROPOSED.md)
- Proposed backend architecture:
  [`docs/startup-grind/02-architecture/BACKEND_MODULAR_MONOLITH_PROPOSAL.md`](./docs/startup-grind/02-architecture/BACKEND_MODULAR_MONOLITH_PROPOSAL.md)
- AI engineering contract: [`AGENTS.md`](./AGENTS.md)

The former `ClydeQue/Wash-Go` repository is a legacy reference only. Do not add
new product work there. Its frontend was migrated into this repository on
2026-07-17.

## Applications

| Path                    | Purpose                                                        | Status           |
| ----------------------- | -------------------------------------------------------------- | ---------------- |
| `landing-page/`         | Public Next.js onboarding site and app-download handoff        | Active           |
| `frontend/`             | Migrated TanStack Start customer-web prototype; reference only | Builds; archived |
| `backend/`              | Planned NestJS API and BullMQ workers                          | Not scaffolded   |
| `apps/customer-mobile/` | Planned React Native/Expo customer application                 | Not scaffolded   |
| `apps/rider-mobile/`    | Planned React Native/Expo rider application                    | Not scaffolded   |

The migrated `frontend/` preserves unfinished legacy work, but is not a product
runtime. The accepted direction is React Native/Expo for mobile, the
`landing-page/` for public onboarding only, and TomTom integrations behind the
NestJS backend. A private operations console may be added later as a separate,
authenticated deployable; it is not the public website.

## Quick start

### Archived customer-web prototype

Requires Node.js `22.13.0` or newer.

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:3000`.

### Marketing landing page

```bash
cd landing-page
npm ci
npm run dev
```

Open `http://localhost:3001`.

## Engineering workflow

Every human or AI contributor must:

1. Read [`AGENTS.md`](./AGENTS.md).
2. Use [`.ai/prompts/START_TASK.md`](./.ai/prompts/START_TASK.md) before editing code.
3. Implement a bounded change with explicit acceptance criteria.
4. Run the relevant verification commands.
5. Create a Markdown record under `docs/startup-grind/04-code-updates/`.
6. Publish or update the matching record in the Notion Code Updates database.

This workflow is designed to make AI assistance explainable, reviewable, and
useful for learning rather than producing undocumented code.
