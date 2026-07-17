---
update_id: WAG-20260717-legacy-frontend-migration
title: Migrate legacy frontend into the DOST repository
date: 2026-07-17
status: verified-with-gaps
notion_sync: https://app.notion.com/p/3a076e8ead9081dca3e3e8e1c1414550
repository: Wash-Go/wash-and-go
branch: main
---

# Migrate legacy frontend into the DOST repository

## Executive summary

The unfinished frontend from `ClydeQue/Wash-Go` was migrated into
`Wash-Go/wash-and-go/frontend`. The new DOST organization repository is now the
source of truth. The newer Next.js landing page, product plan, specification,
and Figma assets were retained.

> Architecture update: ADR-002, accepted later on 2026-07-17, supersedes the
> Flutter and shop/admin-web direction recorded at migration time. The legacy
> frontend is now an archived reference; mobile uses React Native/Expo and the
> public Next.js site is onboarding-only.

## Source and destination

| Role                  | Path                                                                      | Remote                |
| --------------------- | ------------------------------------------------------------------------- | --------------------- |
| Legacy source         | `/Users/clyde/development/ClydeOS/projects/startups/Wash&Go/frontend`     | `ClydeQue/Wash-Go`    |
| Canonical destination | `/Users/clyde/development/ClydeOS/projects/startups/wash-and-go/frontend` | `Wash-Go/wash-and-go` |

## Migration method

The current legacy working tree was copied so the unfinished
`FeaturesSection.tsx` change was preserved. The following generated, local, and
sensitive paths were excluded:

- `node_modules/`
- `dist/`
- `.tanstack/`
- `.DS_Store`
- `.env` and `.env.*`

An `rsync` checksum dry run reported no difference between the filtered source
and destination immediately after migration.

## Retained DOST work

- `landing-page/`
- `PLAN.md`
- `docs/spec.md`
- `docs/Wash&Go UI_UX/`
- `CLAUDE.md`

## Verification evidence

| Check                  | Result               | Notes                                                                              |
| ---------------------- | -------------------- | ---------------------------------------------------------------------------------- |
| `npm ci`               | Passed with warnings | Clean install from the updated lockfile; Node engine warnings remain               |
| `npm run format`       | Passed               | All migrated frontend files use the configured Prettier style                      |
| `npm run lint`         | Passed               | No ESLint errors                                                                   |
| `npm run type-check`   | Passed               | Strict TypeScript check                                                            |
| `npm run test`         | Passed               | One initial `StatsBanner` component test                                           |
| `npm run build`        | Passed with warning  | Client and SSR bundles built; local Node version is below Vite's supported version |
| `npm audit --omit=dev` | One low finding      | Reduced from 12 production-tree findings without forced upgrades                   |

The retained Next.js landing page was also verified:

| Check                  | Result                | Notes                                                                                 |
| ---------------------- | --------------------- | ------------------------------------------------------------------------------------- |
| `npm run lint`         | Passed                | Migrated from removed `next lint` command to ESLint flat config                       |
| `npm run type-check`   | Passed                | TypeScript check completed                                                            |
| `npm run build`        | Passed                | Next.js static production build completed                                             |
| `npm audit --omit=dev` | Two moderate findings | PostCSS findings nested under Next.js; npm only proposes an unsafe breaking downgrade |

## Known inherited risks

- The current machine uses Node `22.11.0`; installed tooling requires at least
  Node `22.12.0`, and ESLint packages require `22.13.0`.
- The migrated frontend retains one low-severity esbuild development-server
  advisory after all non-forced audit fixes.
- The landing page retains two moderate PostCSS advisories nested under Next.js.
- Several dependencies use the `latest` range, which reduces reproducibility
  when the lockfile is regenerated.
- The customer-web routes are incomplete.
- The legacy frontend uses TanStack Start but ADR-002 classifies it as an
  archived reference rather than a deployed customer or operations surface.

## Rollback

Remove the new repository's `frontend/` directory before commit. The legacy
repository remains intact as a recovery source.

## Concept learning

A migration should separate **source code** from **derived artifacts**. Source
files, package manifests, lockfiles, and assets describe the application.
`node_modules`, build output, caches, and environment files are machine-specific
or reproducible and should not be migrated as product source. This keeps the
new repository smaller, safer, and easier to verify.

## Follow-up work

- Add a supported Node version contract.
- Upgrade local Node to `22.13.0` or newer.
- Expand component and route behavior tests beyond the initial smoke test.
- Recheck the remaining dependency advisories during framework upgrades.
- Decide which legacy customer-web elements belong in the React Native apps or
  public onboarding website.
