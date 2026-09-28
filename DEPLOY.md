# Deploy — Wash & Go pilot

Target: **API on Railway** (Docker), **web apps on Vercel**, **Postgres on Railway**.
Cost matrix: ~$45/mo recurring + $124 one-time (see the cost PDF).

---

## 1. API → Railway

1. **New project** → deploy from the GitHub repo, branch `main`. Leave **Root
   Directory empty** (repo root) — the Dockerfile needs the whole monorepo
   (`pnpm-workspace.yaml`, `packages/`) as its build context. Railway reads the
   root `railway.json` (Dockerfile build at `apps/api/Dockerfile`, healthcheck
   `/health/ready`). Setting Root Directory to `apps/api` breaks the build.
2. **Add Postgres** — Railway → "+ New" → Database → Postgres. It exposes
   `DATABASE_URL`; reference it in the API service.
3. **Set env vars** on the API service (see `apps/api/.env.production.example`):
   - `NODE_ENV=production`
   - `AUTH_DEV_BYPASS=0`  ← must be 0; the app refuses to boot otherwise
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = the service-account JSON (one line)
   - `MAPS_PROVIDER=tomtom`, `TOMTOM_API_KEY=…`
   - `CORS_ORIGINS` = the Vercel web origins (comma-separated)
4. **Deploy.** The container runs `prisma migrate deploy` then boots. Confirm
   `GET /health/ready` returns `{status:ok,db:up}`.
5. **Seed** (one-time): from a Railway shell or locally against the prod DB,
   `pnpm --filter @wash-and-go/api prisma:seed` — but replace the pilot shops /
   rates with the **real rate card** first.

Build/run locally to verify: `docker build -f apps/api/Dockerfile -t washgo-api .`

## 2. Web apps → Vercel

Three Vercel projects, all from the same repo, each with a **Root Directory**:

| Project | Root directory | Framework |
|---|---|---|
| admin-dashboard | `apps/admin-dashboard` | Next.js (`vercel.json`) |
| laundry-portal | `apps/laundry-portal` | Next.js (`vercel.json`) |
| landing-page | `apps/landing-page` | TanStack Start (auto-detect / set build) |

For each: set env **`NEXT_PUBLIC_API_URL`** = the Railway API URL. Vercel detects
the pnpm workspace and installs from the repo root automatically. Add each
project's domain to the API's `CORS_ORIGINS`.

## 3. Mobile → app stores

- Build with **EAS** (`eas build`), free tier covers the pilot.
- Point the apps at the prod API: `EXPO_PUBLIC_API_URL` = Railway URL. `.env` is
  git-ignored so EAS doesn't upload it — set the `EXPO_PUBLIC_*` vars in EAS
  (expo.dev → project → Environment variables). See each app's `.env.example`.
- Submit: **Apple Developer** ($99/yr), **Google Play** ($25 once). Store
  credentials live in `eas credentials`, not env vars.
- Lock the iOS `bundleIdentifier` / Android `package` before the first store
  upload — they can't change after release.

---

## ⚠ Pre-production blockers (not code-deploy, but gate a public launch)

1. **Staff accounts.** All four apps have real Firebase login (the `x-dev-uid`
   stub is dev-only). Before a real prod login works, create Firebase accounts for
   the admin/shop/rider people and grant their roles on the admin **Users** page.
2. **Rate card** — rates are set per partner shop; none onboarded yet. Seed rates
   are indicative (₱25/kg) until shops set their own.
3. **Rider pay model** — flagged blocking in PLAN.md; needed to recruit riders.
4. **Shop + rider onboarding** — seed or an admin onboarding flow.

## Post-deploy checklist

- [ ] `AUTH_DEV_BYPASS=0`, `NODE_ENV=production` on the API
- [ ] `/health/ready` → db:up
- [ ] `CORS_ORIGINS` lists every web origin
- [ ] Real rate card seeded; pilot coverage zone active
- [ ] Firebase Phone provider enabled (customer OTP)
- [ ] TomTom key restricted (referrer / IP) for the mobile map key
- [ ] Sentry DSN wired (optional) + the money alerts

## Env var reference (API)

| Var | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `production` |
| `DATABASE_URL` | yes | Railway Postgres (`${{Postgres.DATABASE_URL}}`); interim = Neon SG |
| `AUTH_DEV_BYPASS` | yes | `0` in prod |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | yes | service-account JSON as a string |
| `TOMTOM_API_KEY` | yes | server key with **Search API + Routing API** enabled; a rejected key degrades silently (no geocode/search) |
| `MAPS_PROVIDER` | no | `tomtom` (only implemented adapter) |
| `GOOGLE_MAPS_API_KEY` | no | not read yet — reserved for a future Google adapter |
| `CORS_ORIGINS` | yes (prod) | comma-separated web origins, exact, no trailing slash |
| `PORT` | no | Railway injects it |
| `SENTRY_DSN` | no | free Sentry Node project → 5xx error reporting; unset = off |
| `SENTRY_ENVIRONMENT` | no | defaults to `NODE_ENV` |
| `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | no | Cloudflare R2 for onboarding proof uploads; all four or uploads 503; bucket CORS must allow PUT+GET |
| `REDIS_URL` | no | Phase D |
