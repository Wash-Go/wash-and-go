# U0 — audit-found bug fixes

Spec: `personal-docs/ui-ux-plan-2026-09-28.md` section U0 (git-ignored; the rows below restate
each bug so this plan stands alone). Design authority for any UI touched: `DESIGN.md`.
Branch: `fix/u0-audit-bugs` (off `feat/api-express-lite-slice`, which production deploys from —
do not push to that branch). Scout map of exact locations: `.superpowers/scout-u0.md`.

## Global Constraints

- **Test-first** for all API/domain logic: write the failing spec, then the fix. UI-only changes
  need at least a logic/unit test where the app already has a jest setup; otherwise describe the
  manual/browser check in the report.
- API unit tests: `pnpm --filter @wash-and-go/api test:unit`. API integration tests (real
  Postgres, no Docker): from apps/api run `DATABASE_URL=postgresql://ban@localhost:5432/wash_and_go_test npx jest --testRegex '.*\.integration\.spec\.ts$'`
  (the `test:int` script is currently broken: its `--testMatch` conflicts with the config's `testRegex` and runs nothing; Task 10 fixes it).
- Before every commit that touches `apps/api`: `pnpm --filter @wash-and-go/api build` must pass
  (type-check + jest passing is NOT enough; `nest build` catches TS2307).
- The API may only **type-only** import `@wash-and-go/domain` / `@wash-and-go/maps` (value imports
  crash at boot). Shared runtime constants are hand-mirrored in the API and pinned by parity specs.
- Prisma migrations: `prisma migrate dev` fails non-interactively here — author migration SQL by
  hand under `apps/api/prisma/migrations/<timestamp>_<name>/migration.sql` and apply with
  `prisma migrate deploy` against the test DB.
- Type-check the touched workspace(s): `pnpm --filter <pkg> type-check`.
- Do NOT restyle screens. U0 is correctness. New UI elements (a phone field, an error line, a
  confirm step) use existing components and the existing theme; no new colours/fonts (the
  DESIGN.md token migration is a later slice, U1).
- Commits: Conventional Commits, full-prose body explaining why, trailer exactly:
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Write commit messages to a file and
  use `git commit -F <file>` (inline `-m "...\n..."` has produced literal `\n` in this repo).
- Never `git push`. Never touch `feat/api-express-lite-slice` or `main`. Never bare `git stash`.
- Customer auth stays email + password (phone OTP is on hold). Phone becomes a required field at
  customer sign-up.
- Money correctness beats convenience: when unsure, block the risky action and explain, rather
  than allow it silently.

## Task table

| Task | Title | model | where | reviewer model |
|---|---|---|---|---|
| 1 | Web apps create the DB user (POST /auth/session) | opus | in place | sonnet |
| 2 | Rider: deliver + collect cash as one atomic action | opus | in place | opus (money) |
| 3 | Weigh-in guard: require weight before Ready; big-delta confirm; portal errors visible | opus | in place | opus (money) |
| 4 | Customer phone number at sign-up + editable; hide placeholder phones | opus | in place | sonnet |
| 5 | Rider app: role/verification gate, correct active count, Cash refresh | opus | in place | sonnet |
| 6 | Quote checks coverage; client ceiling + slots from server config | opus | in place | sonnet |
| 7 | SlideToConfirm: fresh handler, pending state, cancel, a11y | opus | in place | sonnet |
| 8 | Admin: server-side status filter, payouts shop name + totals, money-page cache, visible errors, chip CSS bug (admin + portal) | opus | in place | sonnet |
| 9 | Landing: single React copy (SSR crash) + working mobile menu | opus | in place | sonnet |
| 10 | e2e: customer-book spec matches the current booking flow | opus | in place | sonnet |

## Task 1: Web apps create the DB user (POST /auth/session)

**Bug:** `packages/api-client` exposes `postSession()` (POST `/auth/session`, idToken in body), which
creates the Postgres `User` on first sign-in. Only customer-mobile (login + auth restore) and
rider-mobile (login only) call it. admin-dashboard and laundry-portal never do, so a brand-new
Firebase account signing into a web app has no DB row: every API call returns 401 "User not found",
and the person never appears on the admin Users page to be granted a role. This blocks shop
self-signup and ops onboarding.

**Fix:** In admin-dashboard and laundry-portal, call `postSession()` after a successful Firebase
sign-in AND when an existing Firebase session is restored (same pattern as customer-mobile
`_layout.tsx`). Idempotent; failures surface a human error on the login screen (not silent).
rider-mobile: also call it on auth restore (it only calls on login today).
Dev stub path (x-dev-uid, no Firebase user) must keep working — do not call postSession without a
Firebase user.

**Tests:** unit-test the "ensure session" helper per app if the app has jest (admin/portal/rider do:
check their `test` scripts); otherwise document the manual check.

**Done when:** a new Firebase email user signing into admin or portal gets a DB row (visible via
GET /admin/users) without touching the customer app.

## Task 2: Rider: deliver + collect cash as one atomic action

**Bug:** rider job detail has two separate slides: "Mark delivered" (status → DELIVERED) and
"Record cash collected" (POST `/orders/:id/pay-cash`, sets `paidCashAt`). Rider COD owed counts only
orders with `paidCashAt`. A rider who delivers and skips the second slide leaves the cash uncounted,
which also lets them get around the COD debt cap (`riderCodCapPhp`, default ₱1,500).

**Fix (API, test-first):** for cash-on-delivery orders, the rider's transition OUT_FOR_RETURN →
DELIVERED records the cash in the same transaction (sets `paidCashAt` + whatever payCash sets),
idempotently (a later explicit pay-cash on an already-paid order is a no-op success, not an error;
respect the existing idempotency-key behaviour). Admin-driven DELIVERED keeps working (admin may be
correcting records — decide and document: recommended = same behaviour for admin, since COD is the
only payment method at launch). Existing already-delivered-but-unpaid orders: leave data alone, but
make sure they still show in rider cash as "unrecorded" if the app lists them (or document).

**Fix (rider app):** replace the two slides with one: "Slide: collected ₱<total> & delivered"
(amount from the order total, formatted with the existing peso helper). Remove the separate
record-cash slide for the normal path; keep a way to record cash for any legacy delivered-unpaid
order (show the old slide only when status is DELIVERED and paidCashAt is null).

**Tests:** API unit + integration spec: deliver sets paidCashAt; rider outstanding COD increases on
deliver; double deliver/pay is idempotent; cap enforcement sees the new amount.

## Task 3: Weigh-in guard: require weight before Ready; big-delta confirm; portal errors visible

**Bugs:** (a) the portal lets a shop mark an order READY_FOR_RETURN without ever weighing it; the
API transition doesn't require a weight either, so the customer is billed on the estimate. (b) the
weigh input accepts absurd values (70 kg on a ~6 kg Medium estimate → ₱1,797) with a normal confirm.
(c) weigh and status mutations fail silently in the portal (500 and 409 show nothing).

**Fix (API, test-first):** PROCESSING → READY_FOR_RETURN (and any path into READY_FOR_RETURN) is
rejected with a 400 and a human message ("Weigh this order before marking it ready") when the order
has no recorded actual weight. Validate the weigh input server-side: > 0 and ≤ a sane maximum
(use 50 kg unless an existing config/constant defines one — reuse it if so; ledger the value).

**Fix (portal):** input shows its unit ("kg"), uses a decimal keyboard, 16px+ font. Show the delta vs
the load-category estimate; when the entered weight is more than 2× the estimate or more than
+5 kg over it, require an explicit second confirm ("That's 64 kg more than expected. Confirm 70 kg?").
Disable "Mark ready" until weighed, with the reason shown. Every mutation shows pending state and a
visible error message (human copy, no URLs or raw server text) with retry; success gives feedback.

**Tests:** API spec for the READY guard + weigh validation; portal unit tests for the delta/confirm
threshold logic (extract it into a pure function).

## Task 4: Customer phone number at sign-up + editable; hide placeholder phones

**Bug:** email sign-ups get `phone = "pending:<uid>"` (placeholder) and an empty name. The rider app's
Call button then dials garbage. No phone is ever collected.

**Must-fix carried from Task 1:** `upsertByFirebaseUid` (users.repository) resets an email user's
phone to `pending:<uid>` on EVERY session call, and after Task 1 the web apps and rider app call
POST /auth/session on every load/restore. The upsert must never overwrite an existing real phone
(or name) — only fill placeholders on first create. Test it.

**Fix (API, test-first):** accept `name` and `phone` for the signed-in user (either on POST
/auth/session or a new `PATCH /me` — pick the smallest change that fits existing patterns; ledger
it). Validate PH mobile numbers: accept `09XXXXXXXXX`, `9XXXXXXXXX`, `+639XXXXXXXXX`, `639XXXXXXXXX`
(spaces/dashes stripped) and store normalized E.164 `+639XXXXXXXXX`; reject others with 400. If
`User.phone` is unique, a duplicate returns 409 with a human message. Placeholder phones
(`pending:`) must never be returned to riders/shops as a callable number (return null instead).

**Fix (customer app):** sign-up form adds required Name and Mobile number fields (validated client
side with the same rules, `keyboardType="phone-pad"`); after Firebase sign-up, send them. Existing
users with a placeholder phone are prompted once (after login) to add their number before booking.
Profile shows name + phone.

**Fix (rider app):** hide the Call button when the customer phone is null.

**Tests:** API specs for normalization/validation/duplicate/placeholder masking; customer-app unit
test for the phone validator if it has jest (share the rule; the API must not value-import domain —
mirror it and add a parity spec if you put it in `packages/domain`).

## Task 5: Rider app: role/verification gate, correct active count, Cash refresh

**Bugs:** (a) any signed-in user can use the rider app; a CUSTOMER sees their own customer orders
listed as "jobs" and the Cash tab 403s. (b) the Jobs header "N active" counts delivered and
cancelled jobs. (c) the Cash tab loads once and never refreshes (stale after recording cash).

**Fix:** after sign-in / restore, fetch the user's roles (existing /me or session response). No
RIDER role → a clear screen: "This app is for Wash & Go riders" + sign out (no job list). RIDER but
riderProfile not VERIFIED → a screen explaining the status (pending / rejected + reason if the API
returns it) and that jobs appear after approval. Count only non-terminal jobs. Cash tab refreshes on
focus and supports pull-to-refresh. Dev x-dev-uid stub must keep working (dev riders are VERIFIED).

**Tests:** unit tests for the gate decision function and the active-count function.

## Task 6: Quote checks coverage; client ceiling + slots from server config

**Bugs:** (a) `quoteOrder` doesn't check the service zone, but order creation does → an out-of-area
customer sees a full price, then Confirm fails. (b) the Express weight ceiling is hardcoded in the
customer app (`lib/format.ts`) while the server uses the admin-editable
`PlatformConfig.expressWeightThresholdKg` → admin changes cause checkout errors. Pickup slots are also
hardcoded client-side.

**Fix (API, test-first):** quote runs the same coverage check as create and returns the same error
shape/message. Expose the customer-relevant config (express ceiling kg; any slot config the server
already has) on a public or CUSTOMER-readable endpoint if none exists (smallest change; ledger it).

**Fix (customer app):** read the ceiling from the API (fallback to the current constant only while
loading/offline); if the server has no slot source, leave slots as-is and note it in the report
(don't invent a slot model). Out-of-area shows a human message on the Book/checkout screen before
the price (reuse existing error display).

**Tests:** API specs for quote coverage; customer-app unit test for ceiling-driven category gating.

## Task 7: SlideToConfirm: fresh handler, pending state, cancel, a11y

**Bug:** `SlideToConfirm` (packages/ui) creates its gesture handler once, capturing the first
`onConfirm` → the parent's `busy` guard is useless and a double slide triggers a 409 toast. The thumb
snaps back with no loading state; no gesture-cancel handling (thumb can stick if a scroll takes
over); not operable by VoiceOver/TalkBack.

**Fix:** always invoke the latest `onConfirm` (ref pattern); accept a `busy`/`pending` prop that locks
the control and shows progress; handle terminate/cancel by resetting the thumb; expose
`accessibilityRole="button"`, `accessibilityLabel` = the label, and `accessibilityActions`
`activate` that triggers confirm (so screen-reader users can activate it). No visual restyle.

**Tests:** unit test (packages/ui has tests — see scout map) for latest-handler + busy lock.

## Task 8: Admin fixes + chip CSS bug

**Bugs:** (a) Dispatch status filter runs client-side over the newest 50 orders → older BOOKED orders
vanish from the filter. (b) Payouts table shows raw `batch.shopId` instead of the shop name; totals
are computed from the filtered rows so "Owed" shows ₱0 under the Paid filter. (c) query cache is
persisted to localStorage for 24h and never refetched → money pages (Rider cash, Payouts) show stale
balances. (d) admin mutations with no visible error on failure (close week, mark paid, deposit —
see scout map). (e) status chip background is `var(--muted)` + `'1A'` → invalid CSS → "Booked" has
no fill; same bug in laundry-portal.

**Fix:** (a) pass `status` to GET /orders (server already filters, or add it test-first) and page it.
(b) show shop name (API already returns it or add it); compute totals over all rows per status, not the
filtered subset. (c) exclude money queries from persistence and set a short staleTime + refetch on
window focus for money pages. (d) every mutation shows pending + a human error. (e) replace the
string-concatenated alpha with a real tint colour (existing theme values; no new palette) in both apps.

**Tests:** admin + portal have jest — add tests for any extracted pure functions (totals, chip colour).

## Task 9: Landing: single React copy (SSR crash) + working mobile menu

**Bugs:** (a) the production homepage crashes during server rendering (React error #419) because two
copies of React are installed (one nested under `@tanstack/react-router`); crawlers and link
previews get a page with no `<h1>`/content. Only home breaks (only page using hooks). (b) the navbar
hamburger button has no onClick → phone visitors can't open the menu.

**Fix:** find the real root cause first. The live capture attributed #419 to a nested React copy
under `@tanstack/react-router`, but a later scout found a single `react@19.2.0` — treat the cause
as unconfirmed. Reproduce (build + serve, fetch `/` without JS, read the server error), then fix
the actual cause (dedupe if it is duplication; otherwise e.g. a hook/router-context misuse on the
home route, a client-only API during SSR, or a Suspense boundary). Verify: server-rendered HTML of
`/` contains the hero `<h1>` text and the server log has no React #419. Implement the
mobile menu (open/close state, accessible button with `aria-expanded`, closes on navigation and
Escape), styled with existing classes only.

**Tests:** a build + SSR check command in the report (e.g. build then `curl` the preview server and
grep the `<h1>`); lockfile change committed.

## Task 10: e2e: customer-book spec matches the current booking flow

**Bug:** `e2e/tests/customer-book.spec.ts` targets a removed "Pickup address" field and "Find this
address" button (the map picker replaced them; the map can't render on Expo web).

**Also:** fix `apps/api` `test:int` script (its `--testMatch` conflicts with jest config `testRegex`, so it runs no tests) so `pnpm --filter @wash-and-go/api test:int` runs the integration specs.

**Fix:** seed a saved address via the API (x-dev-uid dev bypass, like `e2e/lib/seed.ts`) and book via
the saved-address path; keep the Express and Scheduled cases; clean up after. Update any other e2e
spec the Tasks 1–9 changes break (e.g. the rider deliver slide, portal weigh flow) if their selectors
changed. Run the relevant specs locally against: API on :4000 started with
`DATABASE_URL=postgresql://ban@localhost:5432/wash_and_go_design AUTH_DEV_BYPASS=1 NODE_ENV=development node apps/api/dist/src/main.js`
(build first) — report pass/fail honestly; flaky Expo-web DOM detach is known, re-run once.
The customer app has NO dev auth stub on web: it uses real Firebase. The earlier capture signed in
with the e2e Firebase account `tester@washandgo.app` and swapped the API token for
`x-dev-uid: dev-customer` via Playwright request interception — see the working scripts in
`/private/tmp/claude-501/-Users-ban-dev-wash-and-go/357fdf2b-78be-4667-be40-5af1a91cf2b5/scratchpad/customer/`
and whatever `e2e/` already does for customer specs.
