# Laundry portal — full shop experience: UX + build plan

Goal: `apps/laundry-portal` becomes everything a partner laundry needs, used on a phone during a
shift: sign up → get verified → set services and rates → work the order queue → get paid → manage
staff → get help. Brand per DESIGN.md (navy #0B3773 structure, sky #4EBBE6 identity, Archivo
Expanded display, Atkinson Hyperlegible body/mono). Base `main` (has the U0 fixes). Scout map:
`.superpowers/scout-portal.md`. Audit findings: `personal-docs/ui-ux-plan-2026-09-28.md` §U3c.

## Decisions (Ban, 2026-10-19)
- **PWA:** the portal is an installable Progressive Web App (manifest with the whale icons, service
  worker, install prompt, app-shell cached, last-seen queue readable offline, works on phone/tablet/
  desktop). Next.js + Serwist (or next-pwa if simpler) — chosen in B1.
- **Weigh-in approval flow deferred:** the shop confirms the weight; price updates; customer is
  notified. Wording is "Confirm ₱X" (not "send for approval"). Customer approval for over-estimate
  weigh-ins becomes its own slice (B7) after the portal is complete.
- R2 not yet: the document-upload step ships gated ("coming soon") until `R2_*` env exists.
- Self-management, all four: services + rates, hours + capacity, profile + payout account, staff invites.
- Workflow addition: new-order badge + sound only (no decline / flag / per-piece this round).
- Pilot shops self-serve through the wizard → wizard is an early slice.

---

## Part A — UX design

### A1. Who and where
Shop owner (money, settings) and shop staff (work orders). Phone in one hand, often wet, bright
room, noisy; a desktop/laptop at the counter sometimes. Mode: **Operate**. Rules: one primary
action per card, 44px targets, 16px inputs (no iOS zoom), status = icon + word + colour, human
errors with a next step, nothing destructive without a confirm, money in mono.

### A2. Information architecture (routes)
```
/login                 sign in · forgot password · "Register your laundry" link
/signup                create account (name, email, password, mobile) → wizard
/onboarding            wizard (steps below) · pending/rejected/verified states
/                      Orders (default after login when VERIFIED)
/orders/[id]           Order detail sheet (route so it deep-links)
/services              Services & rates (OWNER edit, STAFF read)
/payouts               Payouts: pending + batches + batch detail
/payouts/[id]          Batch detail (per-order lines)
/shop                  Shop profile: name, address + map pin, contact, hours, capacity, payout account
/staff                 Members + invites (OWNER)
/help                  How it works · weigh-in rules · payouts · contact ops
```
Nav: phone = bottom tab bar (Orders · Services · Payouts · Shop · More[Staff, Help, Sign out]);
≥1024px = left rail. Header: whale mark + shop name + verification chip + "updated 12 s ago".

### A3. Flows
1. **Register → verified:** signup → wizard (6 steps, resumable, autosaves each step via
   `PATCH /shop/onboarding`) → Submit → "Under review" screen (what happens next, contact) →
   admin verifies → first login after that lands on Orders with a one-time "You're live" banner.
   Rejected → reason shown + "Fix and resubmit" (reopens the wizard at the relevant step).
2. **Work an order:** Needs you → card → Weigh (kg, live breakdown, delta vs estimate, second
   confirm when > 2× or > +5 kg) → Confirm → "Mark washing" → "Ready for pickup" → rider collects
   → Done. Each step one tap, explicit feedback, undo not offered (ops corrects).
3. **New order lands:** tab-title count, in-app chime (user-enabled, remembered), card appears at
   the top of Needs you with a "new" ring for 60 s.
4. **Set rates:** Services → pick catalog item → ₱ + unit (per kg / per piece / flat) +
   turnaround hours → Save → audit row; rate shown with "customers see this" note.
5. **Get paid:** Payouts → pending amount (unbatched delivered orders) → batches → detail →
   reference once marked paid. Payout account captured in Shop with masking.
6. **Staff:** invite by email → pending invite → the invitee signs in with a verified email and
   accepts from an "X invited you" card in the portal (explicit `POST /shop/invites/:id/accept`;
   never silently on sign-in) → remove.

### A4. Screens and states (every screen has loading / empty / error / offline)
- **Login:** lockup, email, password, show/hide, Forgot password (Firebase reset email),
  "Register your laundry". Errors inline, human. Dev stub chip only in dev.
- **Signup:** name, email, password, mobile (PH format, same validator as customer app). After
  create: `POST /auth/session` → `startShopOnboarding` → wizard.
- **Onboarding wizard:** progress bar 1–6; Back/Next; autosave; each step validates inline.
  1. Laundry details: shop name, contact phone, short description.
  2. Location: address search (TomTom via `/geocode/search`) → map pin (Leaflet/CARTO, draggable),
     landmark line; "Customers within your zone will see you".
  3. Services & rates: catalog list with toggles; ₱ + unit + turnaround per enabled item; preview
     "6 kg wash, dry & fold = ₱150".
  4. Hours & capacity: open days/hours (simple grid), Express slots per day (what it means).
  5. Documents: business permit + storefront photos — **gated**: if uploads unavailable, show
     "Document upload isn't open yet; our team will verify in person" and allow submit.
  6. Review & submit: summary cards with "Edit" links; checkbox: info is accurate; Submit.
  States: Draft (resume), Submitted (under review + contact ops), Rejected (reason + resubmit),
  Verified (redirect to Orders).
- **Orders (queue):** tabs with counts: Needs you · Washing · Ready · Done. Card: last-4 code
  big (mono), status chip, customer first name, Express/Scheduled, load size → weighed kg,
  "arrived 38 min ago", one primary button (Weigh / Mark washing / Ready for pickup). Search by
  code; "Load more" (cursor). Pull-to-refresh; offline banner; "new" ring.
- **Order detail:** full timeline, price breakdown (wash, delivery, service fee, total; shop
  payout line = 88%), rider name/vehicle when assigned, weigh history, buttons as on the card.
- **Weigh-in (sheet on the card):** kg input with unit suffix, 16px, decimal keyboard, live
  breakdown (kg × rate, delivery, fee, total) from `/orders/preview`, delta vs estimate in a
  warning box, second-confirm step when > 2× or > +5 kg, primary "Send ₱385.40 for approval"
  (wording per DESIGN.md), pending/success/error states, re-weigh allowed while AT_SHOP/PROCESSING.
- **Services:** list of catalog items (name, unit, your rate, turnaround, active); edit sheet;
  OWNER only; STAFF see read-only with "ask the owner".
- **Payouts:** top: "Pending ₱2,418 · 11 delivered orders not yet batched"; batches table → card
  list on phone (period, orders, amount, status chip, reference); detail: lines per order (code,
  wash value, commission, payout). CSV export.
- **Shop:** profile (name, phone, description), address + pin, hours, capacity, payout account
  (GCash number or bank — masked, OWNER only, confirm on change). Verification status card.
- **Staff:** members (name, role chip), pending invites, "Invite by email", remove with confirm.
- **Help:** how an order moves, weigh-in rules (the 50 kg cap, the second confirm), how payouts
  work (88% / period / reference), contact ops (phone + Messenger — placeholders until founders
  provide), app version.
- **404 / not-a-shop:** a CUSTOMER account signing in sees "This console is for partner laundries"
  + "Register your laundry" + Sign out (mirrors the rider gate).

### A5. Components (portal design kit, DESIGN.md tokens)
AppShell (header, tab bar/rail), Chip (status map from `packages/domain`: needs-you peach +
navy outline, moving sky-tint, at-shop shop-tint, done success-tint, cancelled neutral), Card,
PrimaryButton/SecondaryButton/TextButton/DestructiveButton (48px), MoneyInput (56px, mono),
DataTable → CardList under 560px, Sheet (bottom on phone, side on desktop), Toast (`aria-live`),
Skeleton, EmptyState, ErrorState (with retry/back), StaleBanner, Stepper (wizard), MapPin
(Leaflet/CARTO), SearchAddress (TomTom), ConfirmDialog. Typography: display-app 26 Archivo for
the one headline per screen; h2 20/700, body 16, small 14, label 12 caps; mono for codes/₱/kg.
Dark mode: tokens ladder; map tiles dark variant. Icons: one set (Lucide), no emoji.

### A6. Design deliverables before build
- HTML preview (like `docs/design/claim-ticket-preview.html`): Orders queue + weigh sheet,
  wizard step 3, Payouts, phone 390 + desktop 1280, light/dark. Reviewed with `/design-review`
  before Part B starts; founders see it on Vercel preview.

---

## Part B — Build slices (each a ban-init/SDD plan; PR per slice; branch `feat/portal-full` off main)

| # | Slice | Needs API | Status |
|---|---|---|---|
| B0 | Design kit + preview page (A5/A6) | — | done |
| B1 | Brand + shell + PWA (manifest, service worker, install prompt) + login/signup/not-a-shop | `POST /auth/session` (exists) | done (SW cache tied to the signed-in uid; identity never cached) |
| B2 | Orders queue + detail + weigh sheet + new-order badge/sound | `GET /orders?active=true` (new, one page of non-terminal orders) | done |
| B3a | Onboarding + services API: wizard columns migration, submit without R2, `/uploads/status`, `/shop/catalog`, `/shop/services` | new | done |
| B3b | Onboarding wizard (6 steps, gated docs) + email verification notice | B3a | done |
| B4a | Self-management API: `/shop/me`, `/shop/payout-account` (masked), `/shop/members`, `/shop/invites*` with explicit accept, `emailVerified` + `inviteEmailOnFile` on `/auth/me` | new, migration | done |
| B4b | Shop profile / payout account / staff screens + invite card | B4a | done |
| B5a | `GET /shop/remittance/pending`, `GET /shop/remittance/batches/:id`, two-decimal totals | new | done |
| B5b | Payouts page + batch detail + CSV | B5a | done |
| B6a | API polish, real-Postgres integration suite, Swagger response types, dev-only `/dev/users` fixture route | — | done |
| B6b | Help, deferred minors, smokes per screen, Lighthouse (PWA), a11y, CI | — | in progress |
| B7 | Customer approval for over-estimate weigh-ins (API status, customer prompt, notification, auto-accept timeout) | new | deferred; product rule: threshold + timeout |

Order as built: B0 → B1 → B2 ∥ B3a → B3b ∥ B4a → B4b ∥ B5a → B5b → B6a ∥ B6b. API and portal
slices ran in parallel on disjoint paths; each slice had its own review and fix rounds (ledger in
`.superpowers/sdd/2026-10-19-laundry-portal-full/progress.md`, local only).

## Global constraints
- DESIGN.md governs; no new colours/fonts; one primary action per card; 44px targets; 16px inputs.
- Test-first for all API; portal logic in pure `lib/*.ts` with jest; Playwright smoke per slice
  (extend `e2e/tests/laundry-portal-weigh.spec.ts` + new specs); `pnpm --filter @wash-and-go/api
  build` before every API commit; API type-only imports of workspace packages; hand-written
  migrations (`prisma migrate dev` is non-interactive-broken here).
- Every `/shop/*` route derives the shop from ShopMember of the caller; never trust a client shopId;
  OWNER-only for money/settings; STAFF for orders.
- Never push to `feat/api-express-lite-slice` (prod API) from this work; PRs target `main`.
- Founder inputs still owed (placeholders until then): ops contact phone/Messenger; payout account
  policy (GCash vs bank); whether rates need admin approval before going live.
