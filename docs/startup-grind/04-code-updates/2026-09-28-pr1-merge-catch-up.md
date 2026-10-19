---
update_id: WAG-20260928-pr1-merge-catch-up
title: PR #1 merged to main, live infra verified, third-party keys documented
date: 2026-09-28
status: complete
notion_sync: blocked (Notion workspace out of free blocks — create the Code Updates item once space is freed)
repository: Wash-Go/wash-and-go
branch: feat/api-express-lite-slice → main
pull_request: https://github.com/Wash-Go/wash-and-go/pull/1
---

# PR #1 merged to main, live infra verified, third-party keys documented

## Executive summary

The full build branch (`feat/api-express-lite-slice`, ~100 commits since
2026-07-17) is merged into `main` as `e87ad18`. `main` and the feature branch
now hold identical code. Live production was verified service by service, every
third-party key is documented in the `.env.example` files, and the API now
probes its TomTom key at boot so a rejected key can't fail silently again.

This record also backfills the Notion gap: the last hub pages are from
2026-07-21/23, and everything since then shipped without a page because the
Notion workspace hit its free block limit.

## Problem and evidence

- Nothing after 2026-07-23 was documented in Notion (outage, then block limit).
- `main` held only the landing page; prod was actually deploying from the
  feature branch (GitHub deployments: Railway API + Vercel admin at `c34f028`).
- Env examples had drifted from the vars the code reads (e.g. no mobile map-tile
  vars; `GOOGLE_MAPS_API_KEY` listed as if it worked).
- On 2026-09-28 the TomTom server key returned 401 on search, routing, reverse
  geocode and tiles (tested twice); about an hour later the same key returned
  200 on all of them. Cause unknown (transient or account-side). While it was
  401 the app showed nothing: geocode/search degrade to empty by design.

## What shipped on the branch since the last Notion page (2026-07-23 → 08-06)

- **Logistics v1.1:** Express weight ceiling via load categories (S/M/L =
  3/6/9 kg, Express ≤ 6 kg, Large routes to Scheduled); Scheduled booking
  (backend + UI with pickup-window picker); auto-dispatch (admin toggle, default
  OFF, least-loaded VERIFIED rider); multi-factor shop match (capacity →
  distance → turnaround → rating tiebreak).
- **Money safety:** idempotent rider-cash deposits and `POST /orders`
  (idempotency-key header, actor-scoped); order cancellation (customer before
  pickup, admin any non-terminal); **COD debt cap** — `riderCodCapPhp`
  (default ₱1,500): an over-cap rider is skipped by auto-dispatch and rejected
  by manual assign until they deposit.
- **Auth:** real Firebase login on admin, portal and rider (the x-dev-uid stub
  is dev-only; the API refuses to boot with the bypass on outside dev/test).
- **Admin:** Users directory (roles, disable/enable, self-lockout guards),
  Shops onboarding CRUD (services, staff), Applications review queue for shops
  and riders, key-free OSM shop maps.
- **Onboarding (backend + admin review):** shop verification lifecycle
  DRAFT → SUBMITTED → VERIFIED / REJECTED (customers only see VERIFIED + active
  shops); self-serve shop + rider onboarding APIs; dispatch requires a VERIFIED
  rider profile; R2 presigned uploads (inert until R2 keys exist).
- **Customer app:** address book screen, orders pagination + code search,
  ratings, re-order, notifications inbox, map-based location picker (shared
  `packages/ui` map, keyless CARTO @2x tiles, `/geocode/reverse`), unified
  toasts, GPS-permission prompt.
- **Rider app:** bottom tabs (Jobs / Cash / Profile with sign-out +
  verification badge), cash balance + "how payments work", job polling,
  JOB_ASSIGNED notifications, call/navigate hidden on finished jobs.
- **Ops:** Sentry backend error tracking (live), structured JSON logs,
  per-endpoint throttles, `/health/ready` DB probe, CI on every PR + Docker
  image build job, shop payout view in the portal.
- **Review:** `/review` on PR #1 plus one adversarial reviewer per slice
  (#2–#9). All P2/P3 findings fixed; zero open findings at merge.

## This session's changes

- `d364c13` docs(env): every third-party key documented in `apps/api/.env.example`,
  `apps/api/.env.production.example`, both mobile `.env.example` files and the
  DEPLOY.md env table.
- `c0bb938` chore(rider): `ios`/`android` scripts build a native dev client
  (`expo run:*`), matching the customer app.
- `8366753` merge `main` into the feature branch (no file changes — main's only
  unique commit was a cherry-pick of the landing deploy-prep).
- `9364a12` feat(api,maps): `TomTomProvider.checkKey()` boot probe.
- `e87ad18` PR #1 merged to `main` (merge commit, history kept).

## Live infrastructure (verified 2026-09-28)

| Service | Status |
| --- | --- |
| Railway API `wash-and-go-production.up.railway.app` | `/health` + `/health/ready` 200 (cold start can hang ~20 s); x-dev-uid rejected; CORS allows the admin origin |
| Vercel admin `wash-and-go-admin.vercel.app` | live |
| Vercel landing | live |
| Laundry portal | **not deployed** |
| Database | Neon ap-southeast-1 (interim; target Railway Postgres) |
| TomTom (server key) | 200 on search / routing / reverse / tiles (after a 401 window) |
| Map tiles (mobile) | keyless CARTO @2x (default) |
| Sentry | live (backend only) |
| Cloudflare R2 | not provisioned — uploads return 503 |
| PayMongo, Google Maps, prod Redis | not provisioned (Google adapter not built) |

## Founder answers (2026-09-28)

- **Rate card:** set per partner shop; no partner shops yet → show a price
  **range** (numbers and placement still to be decided).
- **Rider pay model, COD cap / netting, payments (PayMongo):** deferred.
- **Pilot shops / riders / zones:** none yet.
- **Fee parameters** (12% commission, ₱40 base, 2 km free, ₱8/km, ₱150 cap):
  unanswered → current defaults stay (admin-editable, no redeploy).
- **R2:** optional for now — needed only when the self-serve onboarding upload
  UIs (portal wizard, rider app onboarding) are built.

## Alternatives and tradeoffs

- **Merge commit vs squash for PR #1:** merge commit kept. The ~100 commits map
  to the review slices (#2–#9) and each carries its own rationale; squashing
  would lose that for `git blame`.
- **Boot probe vs failing boot on a bad key:** probe logs only. Maps is not on
  the critical path (booking works with the haversine fallback + Nominatim
  reverse), so refusing to boot would turn a TomTom-side blip into an outage.

## Security, privacy, and operations

- The probe never logs the key (asserted in the spec). It costs one Search call
  per boot (free tier ~2,500/day).
- `CORS_ORIGINS` must be exact origins with no trailing slash (documented).
- Mobile tile keys ship in the app bundle — use a tiles-only key, never the
  server TomTom key (documented).
- Follow-up for ops: repoint the Railway and Vercel projects from
  `feat/api-express-lite-slice` to `main` (dashboard setting).

## Verification

| Command | Status | Evidence |
| --- | --- | --- |
| `npx jest --testPathIgnorePatterns integration` (apps/api) | Pass | 35 suites, 300 tests |
| `pnpm --filter @wash-and-go/api build` | Pass | nest build exit 0 |
| `pnpm type-check` (apps/api) | Pass | no errors |
| GitHub Actions CI on `9364a12` (push + PR) | Pass | Lint + Type-check, API tests (with Postgres), Build all, Docker build |
| Live probe `TomTomProvider.checkKey()` | Pass | real key → `ok`, bogus key → `rejected` + error log |
| Live curl of Railway `/health`, `/health/ready`, CORS | Pass | 200 / 200 / `access-control-allow-origin` = admin origin |
| Browser / simulator smokes | Not run | no UI changes this session |

## Known limitations and follow-ups

- Notion sync blocked on the workspace block limit (free blocks or upgrade).
- Repoint Railway/Vercel deploys to `main`.
- iOS bundle identifiers (`com.banyel.*`) left uncommitted until the
  publishing identity is decided — they can't change after the first store upload.
- Portal onboarding wizard + rider onboarding UI wait on R2.
- Price-range display waits on the numbers and placement.

## Concept learning

**Graceful degradation hides failures unless you add a canary.** The TomTom
adapter returns `null`/`[]` on a 401 so a booking never hard-fails on a maps
outage. That's the right call per request, but it also means a dead key looks
exactly like "no results": no exception, no 5xx, nothing in Sentry. The fix is
a separate check whose only job is to be loud: here, one probe at boot that
maps 401/403 to an error log. Failure mode to watch: the probe runs only at
boot, so a key that dies mid-deploy stays quiet until the next restart. If that
matters, run the same `checkKey()` on a schedule (BullMQ, once Redis lands).
Debug path: Railway logs → search `TomTomProvider` → `key rejected (401|403)`.
