# Deploy — Wash & Go pilot

Target: **API on Railway** (Docker), **web apps on Vercel**, **Postgres on Railway**.
Cost matrix: ~$45/mo recurring + $124 one-time (see the cost PDF).

---

## 1. API → Railway

1. **New project** → deploy from the GitHub repo. Railway reads `railway.json`
   (Dockerfile build at `apps/api/Dockerfile`, healthcheck `/health`).
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
- Point the apps at the prod API: `EXPO_PUBLIC_API_URL` = Railway URL.
- Submit: **Apple Developer** ($99/yr), **Google Play** ($25 once).

---

## ⚠ Pre-production blockers (not code-deploy, but gate a public launch)

1. **Admin / portal / rider auth.** These apps authenticate with the `x-dev-uid`
   stub, which only works when `AUTH_DEV_BYPASS=1`. In production (bypass=0) they
   get 403. **They need real Firebase login for their roles** (like the customer
   app already has) before a public prod deploy — or run them behind an
   access-controlled pilot environment. The **customer app is prod-ready** (real
   Firebase email/password).
2. **Rate card** — replace the indicative ₱25/kg seed rates with the real ones.
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
| `DATABASE_URL` | yes | Railway Postgres |
| `AUTH_DEV_BYPASS` | yes | `0` in prod |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | yes | service-account JSON as a string |
| `TOMTOM_API_KEY` | yes | maps |
| `MAPS_PROVIDER` | no | `tomtom` (default) |
| `CORS_ORIGINS` | yes (prod) | comma-separated web origins |
| `PORT` | no | Railway injects it |
| `REDIS_URL` | no | Phase D |
