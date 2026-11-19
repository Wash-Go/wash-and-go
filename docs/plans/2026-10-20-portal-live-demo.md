# Shop portal live + CEO demo credential

Goal: the laundry portal runs on a public HTTPS URL as an installable PWA, with a demo laundry
the CEO can sign into during the incubator / investor presentation and walk through end to end:
queue → weigh-in → washing → ready → payouts → services → shop → staff.

## Decisions (Ban, 2026-10-20)
D1 **API hosting: open.** Railway's trial has ended (the service still answers during the grace
   period). Ban will follow up with the CEO; GCP is a candidate if free credits exist. Options
   with tradeoffs, cheapest first:
   - GCP Cloud Run (asia-southeast1 Singapore) + Neon or Cloud SQL: the Dockerfile deploys as is;
     US$300 / 90-day trial credits if the account is new, then pay-per-request (near zero at demo
     volume). Cold starts unless `min-instances=1` (~US$8/month). Cloud SQL smallest instance is
     ~US$10/month; Neon stays free.
   - Railway Hobby ~US$5/month: no migration work; keep Neon.
   - DigitalOcean droplet sgp1 ~US$6/month: self-hosted Docker + Postgres + Caddy; most ops work.
   - Fly.io Singapore ~US$3–5/month + Neon: one-CLI deploy; cold starts unless always-on.
   Whatever is chosen, it deploys `main` after PR #13 merges and runs the three migrations.
D2 **Demo owner = the CEO's own email** (tatelgabrielle19@gmail.com; he sets the password once).
   A staff login (`staff.demo@…`) shows the read-only view.
D3 **Portal hostname = Vercel default** `wash-and-go-portal.vercel.app`.
D4 **Live-order driver: yes.**

## Build order
Hosting-independent work first (P2, P3, P4 runbook), tested against the local API and design
DB. P0/P1 once hosting is decided.

## Phases
### P0 Merge and migrate (blocks P1 and the live run; waits on D1)
- Merge PR #13 into `main`. Repoint the Railway API service (and the Vercel admin project) to
  `main` (the follow-up open since 2026-09-28). Run the three migrations
  (`shop_wizard_fields`, `shop_payout_and_invites`, `shop_logo`) with `prisma migrate deploy`
  against the chosen DB. Confirm `AUTH_DEV_BYPASS=0`, `NODE_ENV=production`,
  `FIREBASE_SERVICE_ACCOUNT_JSON` set and no `GOOGLE_APPLICATION_CREDENTIALS` (the API now refuses
  to boot on a missing file). Health + `/api-docs-json` check. Dev routes must 404.
### P1 Portal on Vercel
- New Vercel project, root `apps/laundry-portal`, production branch `main`. Env: `NEXT_PUBLIC_API_URL`
  (Railway), `NEXT_PUBLIC_FIREBASE_*` web config; **no** `NEXT_PUBLIC_DEV_UID`, no `NEXT_PUBLIC_E2E`.
  Add the portal origin to the API's `CORS_ORIGINS`. Verify: manifest + service worker on HTTPS,
  "Install" prompt on Android Chrome and iOS Safari share-sheet, Lighthouse PWA on the live URL.
- Firebase console: Email/Password sign-in enabled; the portal origin added to authorized domains;
  password-reset email template branded (sender name "Wash & Go").
- Vercel branch previews for the portal (so later changes can be checked before `main`).
### P2 Demo dataset (idempotent script `pnpm demo:seed`, runs from a laptop against the DB URL)
- Shop "Wash & Go Demo Laundry" (or the CEO's chosen name), VERIFIED, Tetuan pin, hours, 3 services
  with rates, Express slots, no payout account at first (so the nudge shows) or a masked GCash.
- Owner account = D2 choice; staff account `staff.demo@…` (member, STAFF).
- Demo customers (3–4, Zamboanga addresses) and a demo rider (VERIFIED, with a vehicle).
- Orders in every bucket: 2 incoming (assigned / picked up), 2 needs-you (at shop, unweighed, one
  over-estimate to show the second confirm), 2 washing, 1 ready, 6 delivered (one rated), 1
  cancelled; one PENDING remittance batch with lines and a ₱ pending total; one PAID batch with a
  reference.
- `pnpm demo:reset`: deletes demo orders/batches/lines, re-creates the dataset; never touches
  non-demo rows (all demo rows carry a marker: customer names/addresses prefixed "Demo",
  shop id pinned). Printed before/after counts.
- The Firebase accounts are created once in the Firebase console or via the Admin SDK in the seed
  (`createUser` with a fixed password; the seed prints the credentials once, never logs them again).
### P3 Live-order driver (D4, optional)
- `pnpm demo:order` signs in as a demo customer and rider through Firebase REST (email/password →
  ID token), books an Express order to the demo shop, and advances it on a timer: assigned (admin
  auto-dispatch or manual assign), picked up, at shop. The CEO sees the badge, chime and the new
  ring; then weighs it live. Idempotency keys so a re-run cannot double-book.
### P4 Presentation hardening
- Warm-up: hit `/health` and `/orders` 2 minutes before the slot (and a 5-minute cron ping on
  Railway during the event window, removed after). Cold start is the one thing that can embarrass.
- Demo runbook `docs/demo/portal-demo-runbook.md`: URL, credentials location (1Password / the
  CEO's phone, not the repo), the 6-minute click path, the reset command, what to say when
  something is gated (logo/permit uploads: "document upload opens with storage").
- Rehearsal: one full run on the live URL from a phone on mobile data, screenshots saved.
- Browser smokes against the live URL with the demo credentials (read-only path), run before the
  event.
### P5 Admin side (optional, if the CEO wants to show verification)
- Admin account for the CEO on the live admin; a second DRAFT demo shop submitted through the
  wizard so "verify" can be clicked live.

## Risks / tradeoffs
- Neon latency + Railway cold start: warm-up is mandatory; D1-B removes the Neon leg.
- R2 absent: logo and permit uploads stay gated (honest copy already in the UI). Provisioning R2
  is ~1 hour if the CEO wants to upload a logo live.
- Map tiles: wizard uses OSM (fine for a demo); mobile apps still need a tile key (separate).
- Demo data in prod (D1-A): acceptable while there are no partner shops; wipe before pilot.
- Credentials: never in git; the seed prints once.

## Out of scope
Customer/rider apps on stores; B7 approval flow; per-shop colours.
