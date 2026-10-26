# Pilot test-ready: rider and shop onboarding, ops kit, payments provider

Goal: a closed pilot in Zamboanga City can run end to end with real laundries, real riders and
invited customers: a rider applies and gets verified from the rider app, a laundry onboards from
the portal, orders flow on cash on delivery, riders see their earnings, every side gets push
alerts, and ops has builds, accounts, a runbook and a reconciliation routine. Business and BIR
registration are the founders' track and are not in this plan, but every gate they unlock is
marked.

Date 2026-10-25. Branch for the build: new `feat/pilot-ready` off `main` after PR #13 merges
(this plan rides on `feat/portal-full` until then). PRs per slice, target `main`.

## Dependency: which side first (2026-10-25)
The council decision in `docs/decisions/2026-10-25-focus-side/README.md` (working pick Option 1, customer-side
concierge, reversal gate = week 1 shop survey) changes T3, T4 and T5 pricing copy and the portal's weigh sheet.
T0, T1, T2 and T6 are side-neutral and proceed. No side-specific pricing code before the week 2 gate.

## Decisions (Ban, 2026-10-25)

- **D1 Pilot shape: closed pilot.** 1 to 2 partner laundries, 2 to 4 riders, invited customers.
  Internal-distribution builds (Android APK via EAS internal, iOS via TestFlight). No store
  listings, no self-serve customer growth, ops can hand-hold.
- **D2 Pilot payments: cash on delivery now, provider behind a flag.** The pilot runs on the
  existing COD rule and rider cash-deposit ledger. A payment adapter and the chosen provider's
  GCash flow are built against the provider sandbox and stay off (`PAYMENTS_PROVIDER=none`) until
  DTI/SEC + BIR 2303 exist. Section "Payments provider" below has the comparison; the provider
  itself is Ban's pick from that table.
- **D3 Rider onboarding: in-app self-apply.** Rider app gets an application wizard with document
  uploads; admin reviews documents and verifies or rejects with a reason; rejected riders fix and
  resubmit. Needs R2 provisioned (T0).
- **D4 Rider pay model: decided at founder sync.** The earnings ledger is built generic (one row
  per completed leg with amount and a model tag) and seeded from a placeholder config. Founder
  sync picks flat per leg, delivery-fee pass-through, or a percentage; only the calculator
  changes.

## What exists today (recon 2026-10-25)

| Area | State | Pointer |
|---|---|---|
| Shop onboarding wizard, verification, services, staff, payouts page, remittance views | built (PR #13) | `apps/laundry-portal`, `apps/api/src/shops`, `apps/api/src/remittance` |
| Shop permit / photo / logo upload | coded, inert until `R2_*` set (503, `documentsPending`) | `apps/api/src/uploads/uploads.service.ts:39-54` |
| Rider onboarding API | partial: `start`/`PATCH`/`submit` with only `licenseKey`, `vehicleType`, `vehiclePlate` | `apps/api/src/riders/rider-onboarding.service.ts:52-85` |
| Rider onboarding screens | missing (login, gate copy "contact ops and apply again") | `apps/rider-mobile/src/lib/riderGate.ts:74-75` |
| Rider document upload, profile edit, OR/CR, selfie | missing | no presign calls in `apps/rider-mobile/src` |
| Rider online toggle, location | missing | `apps/api/src/orders/auto-dispatch.ts:16-17` |
| Rider earnings | missing ("Payouts and support are coming soon") | `apps/rider-mobile/src/app/(tabs)/profile.tsx:72` |
| Push notifications (any app) | missing; riders poll every 5 s | `apps/rider-mobile/src/app/orders/[id].tsx:100` |
| Payments | COD only, no payment column, no provider SDK | `apps/api/src/orders/cash-on-delivery.ts` |
| Remittance to shops | batches close by admin, PAID marked by hand with an external reference | `apps/api/src/remittance/remittance.service.ts:60-85,148` |
| Admin applications (shop + rider verify/reject) | built, no document viewer | `apps/admin-dashboard/app/applications/page.tsx` |
| Map tiles in mobile pickers | keyless CARTO default, dead since 2026-10-20 | `packages/ui/src/leaflet-map.ts:58-61` |
| EAS config, Expo project ids | missing | `apps/*-mobile/app.json`, no `eas.json` |
| Email sending, SMS vendor, cron | none (Firebase handles reset/verify client-side) | `DEPLOY.md` |
| CI | lint, type-check, API tests on Postgres, build | `.github/workflows/ci.yml` |

## Outside-code gates (who, when)

| Gate | Owner | Unblocks |
|---|---|---|
| API hosting decision (Railway trial ended) and `main` deployed with the three portal migrations | Ban + CEO | everything live (T0) |
| Cloudflare R2 bucket + 4 env vars (~1 h) | Ban | permit/logo/rider document uploads (T1, T3) |
| Firebase: Email/Password enabled on prod project, authorized domains, Blaze plan only if Phone OTP is wanted | Ban | real logins on all apps |
| Map tile key: MapTiler free tier (100k tiles/month) or TomTom raster tiles on the existing key | Ban | mobile map pickers (T4) |
| Expo account, EAS project ids, FCM v1 service key for Android push, APNs key for iOS | Ban | builds and push (T0, T2) |
| Apple Developer (US$99/yr) for TestFlight; Google Play (US$25) not needed for APK sideload | CEO budget | iOS pilot devices |
| DTI/SEC + BIR 2303 | founders | any payment provider going live, GCash for Business, PayMongo wallet |
| Rider pay model | founder sync | earnings calculator (T2), rider recruitment |
| Partner laundry agreement + rider agreement drafts, Terms/Privacy final | founders + counsel | acceptance screens (T1, T4, T6) |

## Phases

### T0 Infra unblock (prerequisite, mostly ops; one small code slice)
- Deploy `main` after PR #13: hosting per D1 of the live-demo plan; run `shop_wizard_fields`,
  `shop_payout_and_invites`, `shop_logo`; `AUTH_DEV_BYPASS=0`, `NODE_ENV=production`,
  `FIREBASE_SERVICE_ACCOUNT_JSON`, `CORS_ORIGINS`, Sentry env `production`.
- Provision R2; set `R2_*`; confirm `/uploads/status` returns `configured: true`; portal Logo and
  Documents cards switch from gated copy to live upload (already coded; verify in browser).
- Real portal Vercel project (P1 of the live-demo plan) plus admin dashboard pointing at `main`.
- Tile key: pick provider, set `EXPO_PUBLIC_MAP_TILE_PROVIDER` + key in both mobile apps and in
  the portal wizard map; remove the keyless CARTO default so a missing key fails loudly in dev.
- EAS: `eas.json` per mobile app (profiles `development`, `preview` internal, `production`),
  `extra.eas.projectId`, bundle ids already set (`ph.washandgo.rider`, customer equivalent).
- Code slice: `apps/api` env validation marks `R2_*` as required when `NODE_ENV=production`
  (pilot cannot run with uploads inert); health endpoint reports `uploads`, `maps`, `push`
  readiness flags for the runbook.

### T1 Rider onboarding, self-apply (API + rider app + admin)
API (`apps/api/src/riders`, migration `rider_application_fields`):
- `RiderProfile` gains `fullName`, `idKey`, `orcrKey`, `selfieKey`, `vehicleType` becomes an enum
  (today a free string): `E_BIKE`, `MOTORCYCLE`, `PIAGGIO`, matching the logistics tiers, `vehicleDescription` (colour/model),
  `emergencyContactName/Phone`, `agreementVersion`, `agreementAcceptedAt`, `submittedAt`,
  `rejectedAt`, `rejectionReason` (exists), `documentsPending` (parity with shops when R2 is
  unconfigured).
- `PATCH /rider/onboarding` accepts all fields; every `*Key` passes the existing owned-key check
  (`uploads/{userId}/` prefix, image or PDF). `POST /rider/onboarding/submit` requires license,
  government ID, OR/CR, selfie, vehicle type, plate, agreement acceptance; `documentsPending`
  path when uploads are unconfigured. `POST /rider/onboarding/reopen` moves REJECTED to DRAFT
  keeping the previous answers; admin verify/reject unchanged (reject requires a reason).
- `GET /admin/riders/applications/:id` returns presigned view URLs for the four documents
  (5 min, existing `presignView`). Audit lines on verify/reject. Notifications already emitted
  (`RIDER_VERIFIED`, `RIDER_REJECTED`); add push in T2.
- Tests first: DTO bounds, owned-key rejection, submit completeness matrix, reopen only from
  REJECTED, presigned URLs null without R2, route-roles matrix, Swagger types.

Rider app (`apps/rider-mobile`):
- Apply wizard behind the gate: Welcome (what you need, time estimate) → About you (name,
  phone, emergency contact) → Vehicle (type cards from the tiers, plate, description) →
  Documents (license, government ID, OR/CR, selfie: camera or library via `expo-image-picker`,
  client-side resize to ≤ 1600 px, presign → PUT, retry on failure, per-document status) →
  Agreement (rider agreement text from `packages/domain` with a version constant, checkbox) →
  Review → Submitted ("usually within 1 business day", ops contact from the shared ops-contact
  module). Resume where you left off; draft autosaves through `PATCH`.
- Status screens: under review, rejected (reason + "Fix and resubmit" → reopens), verified →
  tabs. Gate copy updated; "contact ops" line keeps the ops contact.
- DESIGN.md tokens, 44 px targets, no emoji, no em dashes.
- Jest for the pure parts (wizard step validity, document checklist, resize helper); Detox is
  not set up, so the browser smoke is replaced by an Expo web run of the wizard in Playwright if
  the app builds for web, else a maestro-free manual checklist in the report with screenshots
  from a simulator.

Admin (`apps/admin-dashboard`): applications page shows a rider card with the four documents
(thumbnail → full view), vehicle, plate, contacts; verify / reject-with-reason; filter by
status; same for shops (permit + photos) so ops stops chasing documents on Messenger.

### T2 Rider ops: availability, push, earnings
- **Availability**: `RiderProfile.online` boolean, `lastSeenAt`; `POST /me/availability`
  (RIDER); toggle in the rider Jobs tab header; auto-dispatch and the admin assign list prefer
  online riders (`selectLeastLoadedRider` filter; manual assign still allowed for offline).
  Location stays out of scope (no live tracking in the pilot; navigation deep links exist).
- **Push** (both mobile apps, Expo push service, no FCM code of our own): `PushToken` table
  (userId, token, platform, app, updatedAt); `POST/DELETE /me/push-tokens`; API `PushService`
  sends via Expo's HTTP API with receipts check and token pruning on `DeviceNotRegistered`.
  Triggers: `JOB_ASSIGNED` (rider), `ORDER_UPDATE` (customer; one push per status change),
  `RIDER_VERIFIED`/`RIDER_REJECTED`. Portal stays on polling plus the chime (already built).
  Rider app polling interval relaxes to 15 s once a token is registered. Tests: payload builder,
  pruning, no-send when no tokens, Expo client mocked.
- **Earnings ledger (D4 generic)**: `RiderEarning` (riderUserId, orderId, leg `PICKUP`|`RETURN`,
  amountPhp 2dp, model tag, computedAt). Rows are written when an order reaches `AT_SHOP` (pickup
  leg) and `DELIVERED` (return leg) by `RiderPayCalculator` reading `RIDER_PAY_MODEL`
  (`FLAT_PER_LEG` | `DELIVERY_FEE_PASS_THROUGH` | `PERCENT_OF_DELIVERY_FEE`) and
  `RIDER_PAY_PER_LEG_PHP` / `RIDER_PAY_PCT` from platform config (admin Config page gets the
  three fields). Placeholder default `FLAT_PER_LEG` at ₱0 until the founder sync; the admin page
  shows a warning while it is ₱0. `GET /me/earnings?from&to` with totals; rider Earnings tab
  (today, this week, list by order) replaces "coming soon"; Cash tab unchanged. Payout of
  earnings to riders stays manual in the pilot (ops pays via GCash and records it in a
  `RiderPayout` row with reference; admin page), wired to the disbursement adapter in T5 later.

### T3 Shop side pilot gaps (small)
- With R2 live, run the full wizard end to end on the live portal from a phone; fix anything
  the gated path hid. Admin sees the permit (T1 admin card).
- Payout account nudge becomes a blocker for closing the first batch: `closeBatch` refuses (409,
  clear message) when the shop has no payout account; portal Payouts page explains.
- `REMITTANCE_PAID` in-app notification to owner/staff when a batch is marked paid.
- Staff invites: no email vendor in the pilot; the invite card flow stays. Portal shows the
  invitee the exact text to send on Messenger ("Sign up at … with this email, then accept").
- One-page partner onboarding sheet (`docs/pilot/partner-laundry-onboarding.md`): what the
  laundry needs (permit photo, GCash or bank account, rates, hours), the 10-minute wizard path,
  how remittance works in plain words (period wording from the founders).

### T4 Customer pilot gaps (small)
- Tile key wired (T0); map picker smoke on device.
- Checkout says "Pay cash on delivery · ₱X" explicitly with the rider-collects line; "Payment
  methods" row in Profile reads "Cash on delivery during the pilot" instead of "coming soon".
- Terms and Privacy acceptance at signup (version stamp on `User`), links to the PDFs.
- Push for order updates (T2). Support contact in Profile from the shared ops-contact module.
- Invite-only guard for the closed pilot: `PILOT_INVITE_CODES` (comma list) checked at signup
  when set; empty list means open. Removes the need for store listings or fraud guards.

### T5 Payments adapter behind a flag (sandbox only until registration)
- Schema: `Payment` (orderId, provider, providerRef, method `GCASH|MAYA|CARD|QRPH|COD`, status
  `PENDING|PAID|FAILED|REFUNDED`, amountPhp, paidAt, raw webhook event id), `Order.paymentMethod`
  (default `COD`, replaces the implicit rule in `cash-on-delivery.ts`).
- `PaymentProvider` interface (`createCheckout(order) → {redirectUrl|clientKey}`,
  `verifyWebhook(raw, sig)`, `parseEvent`, `refund`) and `PayoutProvider` interface
  (`disburse({to: gcash|bank, account, amount, reference}) → id`, `status(id)`,
  `verifyWebhook`). `PAYMENTS_PROVIDER=none` wires a `NullProvider`; the customer app shows
  GCash only when `/config/public.payments.online` is true.
- First adapter = Ban's pick from the table below, built against its sandbox: checkout creation,
  webhook endpoint with signature verification and idempotent event handling, order marked
  PAID, refund on cancel. Disbursement adapter: `markPaid` on a remittance batch can call
  `disburse` to the shop's payout account and store the provider reference; rider payouts the
  same via `RiderPayout`. Both stay manual-reference when the flag is `none`.
- Tests: adapter unit tests with recorded sandbox fixtures, webhook signature negative tests,
  idempotency, COD path unchanged (regression suite).
- Go-live checklist in `docs/pilot/payments-go-live.md`: documents, account verification, live
  keys, webhook URL, instant settlement request, payout schedule request, limits.

### T6 Pilot ops kit
- Builds: EAS `preview` builds for both apps (Android APK link, iOS TestFlight); `docs/pilot/
  install.md` with QR codes/links; versioning and a changelog per build.
- Accounts matrix: admin (CEO + Ban), 2 shop owners, staff, riders, invited customers; who
  creates what and where; `demo:*` scripts are not used for the pilot (real data only).
- Seed by admin: zones (pilot barangays), rate card via the wizard, `AUTO_DISPATCH_ENABLED`
  decision (manual assign recommended for week 1), `RIDER_COD_CAP_PHP`.
- Runbook `docs/pilot/pilot-runbook.md`: day-0 checklist, daily routine (open, rider online,
  watch queue, close), daily cash reconciliation (COD collected vs rider deposits vs
  `RiderCashDeposit`), weekly remittance close and payout, incident path (Sentry alert →
  Messenger ops group → fix), rollback (previous build links), end-of-pilot data handling
  (export, anonymise or wipe test orders, keep partners).
- Legal: Terms/Privacy acceptance versions (T1, T4), rider agreement and partner laundry
  agreement drafts in `personal-docs/legal`, Privacy draft updated for `User.email`, payout
  account, documents, push tokens, earnings.
- Observability: Sentry release tagging on API and both apps; a daily `/health` readiness ping;
  CI gains the rider app type-check and the new API suites.

## Build order and sizing
T0 (ops, ~1 day once hosting is decided) → T1 (API 1 slice, app 2 slices, admin 1 slice) → T2
(3 slices: availability, push, earnings) → T3 and T4 (1 slice each, parallel) → T5 (2 slices:
schema + checkout adapter, disbursement adapter) → T6 (docs + builds, 1 slice). Rough total
13 slices; executor per slice, reviewer after each, final-reviewer per PR. T5 can start in
parallel with T1 once the provider is picked; nothing in T5 blocks the pilot.

## Payments provider: alternatives to PayMongo

Ban's constraint: PayMongo's weekly payout is a dealbreaker. Two facts to weigh before switching.
First, weekly is PayMongo's default for new accounts, not its ceiling: bi-weekly (Tue, Fri) for
verified businesses, daily or custom by emailing support, plus a paid Instant Settlement add-on
that lands QR Ph and e-wallet payments in the wallet the moment they are paid, 24/7. Second, for
a marketplace the harder requirement is paying shops and riders out by API to GCash and banks,
and PayMongo now has a Disbursements API for that. Every provider below needs DTI/SEC + BIR 2303
before going live, so none is faster to activate than the others.

| Provider | Money in: settlement to us | Money out: payouts to shops/riders | Fees (PHP, ex-VAT, as published) | Onboarding | Fit |
|---|---|---|---|---|---|
| **PayMongo** | Clearing: cards 3 banking days, e-wallets 2, QR Ph / online banking 1. Payout schedule weekly by default, bi-weekly when verified, daily or custom on request. Instant Settlement add-on for QR Ph and e-wallets (approval needed). | Disbursements API: InstaPay real-time ≤ ₱50k, PESONet same/next day ≤ ₱10M, to banks, e-wallets (GCash, Maya) and wallets; webhooks `transfer.outward.*`; test mode; dashboard bulk up to 1,000. | GCash 2.23%, Maya 1.79%, QR Ph 1.34% (2.23% with instant settlement), cards 3.125% + ₱13.39, online banking 0.71% or ₱13.39. Transfers ₱10 each, one free per week. Wallet ₱30 one-time KYC. No monthly fee. | DTI/SEC + BIR; wallet sending limit ₱5k/day new → ₱3M upgraded. | Best single-vendor fit: one webhook contract for collection and payouts. Weekly concern is solved by asking for daily plus instant settlement. |
| **Xendit** | GCash settles T+2 calendar days (official doc); cards and others vary; no instant option documented. | Payouts API: InstaPay ~15 min, PESONet same day (14:00 cut-off), ≤ ₱50k InstaPay; channels include GCash, BPI, BDO, UBP. Several short PH disbursement incidents logged in 2026 (May, Jun, Aug, Oct). | Sources conflict: GCash 2.3% to 3.2%, Maya ~1.8 to 2%, QR Ph 1.4 to 1.5% (min ₱15), cards ~3.2 to 3.5% + ₱10 to ₱11; a fixed ₱11 processing fee per attempt reported from Oct 2026. Payout ~₱10 (unofficial). Pricing page blocks fetch; get the rate card from sales. | DTI/SEC + BIR; aimed at larger merchants. | Strong payout rails, slower collection than PayMongo with instant settlement, and a fee structure that penalises small tickets. Second choice. |
| **Maya Business** | T+1 to the Maya Business Deposit account reported by third parties; Maya-to-Maya QR real-time. Not published; ask Maya in writing. | Unified Transfer API: send to Maya and 100+ institutions (InstaPay/PESONet); Remittance API to Maya wallets. GCash destination not named on the developer page; confirm. | Third-party: QR Ph 0.5 to 1%, payment link 1.5%, Checkout 2.25 to 2.75%; another source says cards 3.5% + ₱10, GCash 2%. InstaPay ₱10 since July 2026 (BSP Circular 1238). Not published. | DTI/SEC + BIR; enterprise-style sales process. | Good if the pilot leans Maya; opaque pricing and sales-led onboarding slow a startup down. |
| **HitPay** | Non-card T+1 calendar day; online cards T+7 (its own pages; wording varies). | Payout API over InstaPay/PESONet to GCash, Maya and banks; "no monthly fee", per-transaction fee not published. | GCash 2.3%, QR Ph 1% or ₱20 min, local cards 3% + ₱15. No setup or monthly fee. | DTI, BIR 2303, bank proof; approval 1 to 3 business days. Singapore company operating in PH. | Low-friction, honest T+1 for wallets; payout fee unknown and the ₱20 QR Ph floor hurts ₱200 orders. Viable third choice. |
| **Netbank** (BSP-licensed bank, API-first) | Collect via virtual collection accounts over InstaPay/PESONet (customer transfers from any bank or GCash); no card or e-wallet acquiring. | Disburse-to-account API: InstaPay (₱5 consumer rate; business rate by contract), PESONet, intrabank ₱2. Direct participant on both rails. | Lowest rails cost; no percentage MDR because there is no acquiring. Terms by contract. | Corporate account opening; DTI/SEC + BIR. | Not a checkout replacement, but the cheapest payout rail when volume grows. Pair with a gateway later if fees bite. |
| **Brankas Disburse** | Collection via Brankas Pay (bank transfer) | Disburse API | Not published; "successful transactions only" | Sales-led | Unknown pricing; skip unless Netbank falls through. |
| **Dragonpay** | T+10 to 12 business days through aggregators; OTC strength (7-Eleven, Bayad, Cebuana) | Payout product exists; terms by inquiry | OTC ₱15 to 20, bank ₱10, cards by evaluation (older figures) | DTI/SEC + BIR | Poor fit: slow settlement, OTC is not our use case. |
| **GCash for Business (direct)** | QR Ph in-store collections settle to the nominated bank next banking day (GCash FAQ, older). No API without a partnership. | None for third parties. | Not published for small merchants. | Verified GCash account ≥ 12 months, fresh email, DTI + BIR 2303. | Only as a manual fallback (static QR at the counter), not an integration. |
| **2C2P, Adyen, Fiuu** | T+1 to T+3 (2C2P); Adyen cards only in PH | Enterprise | Custom | Enterprise contracts | Not for a pilot. |
| **No gateway (pilot default)** | COD; optional static QR Ph to the business GCash wallet (instant to wallet) | Manual GCash/Maya transfers from the ops phone (InstaPay ₱10, same-wallet free), reference typed into mark-paid | Zero platform fees | Needs nothing | What D2 runs until registration. |

Recommendation: keep PayMongo as the first adapter but open the account asking for daily payouts
plus Instant Settlement on QR Ph and GCash, and build on its Disbursements API for shop and rider
payouts; if its instant-settlement approval or the daily schedule is refused, Xendit is the
drop-in second (same adapter interface, better payout rails, worse small-ticket fees). HitPay is
the low-friction fallback for collection only. Netbank is the payout rail to revisit when payout
volume makes ₱10 per transfer matter. Numbers above are from provider pages or third-party
summaries fetched 2026-10-25 and marked where they conflict; confirm the live rate card and
settlement terms in writing before signing. Sources: PayMongo payouts, instant settlement,
disbursements and pricing pages (docs.paymongo.com, paymongo.com/pricing); Xendit payouts
coverage and GCash docs (docs.xendit.co); Maya developer portal (developers.maya.ph); HitPay PH
pricing (hitpayapp.com/ph/pricing); Netbank Virtual (virtual.netbank.ph); GCash for Business
help centre; Inquirer and Philstar on the July 2026 InstaPay fee cut.

## Risks and tradeoffs
- Hosting is still undecided; T0 cannot start without it and nothing in T1 to T6 can be field
  tested without a live API. Local and preview builds can still verify every slice.
- Rider pay at ₱0 placeholder: riders must be told the pay model before recruitment, not after;
  the earnings tab shows the model name and a "pilot rate" line so nothing looks like a bug.
- Push via Expo's service adds a dependency; failures fall back to polling, so nothing breaks.
- No live rider location in the pilot: dispatch is manual or least-loaded; fine for 2 to 4 riders.
- R2 holds government IDs and licenses: presigned 5-minute GETs, owned-key prefix, no public
  bucket, retention policy in the Privacy draft; admin access audited.
- Invite codes keep the customer pool small; a leaked code only lets someone book a COD order.

## Out of scope
Store listings, scheduled/batching engine, live rider tracking, B7 customer approval flow,
per-shop colours, email vendor, SMS vendor, Phone OTP, direct GCash or Maya rails, business and
BIR registration, counsel review of the agreements.
