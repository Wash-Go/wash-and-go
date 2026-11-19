# Alpha v1.2 pilot: app changes (Piaggio batches, offline shops, customer balance)

Source of the operating model: the founders' "Alpha v1.2 Consumer Logistics Pilot Launch Plan" (Confluence, 2026-11).
This document translates that plan into code changes for the four apps and the API. It supersedes, for the pilot,
the shop-portal and bag-price assumptions in `docs/plans/2026-10-25-pilot-test-ready.md` (T3, T5 pricing) and the
Option 1 bag-price implications in `docs/decisions/2026-10-25-focus-side/README.md`. Infra, hosting, registration,
payments-provider go-live, calendar dates, service area and every peso amount are deferred by the founders and are
not in scope here; the code takes them as admin-entered configuration.

## Decisions from Ban (2026-11-19)
- **D1 Portal parked, not deleted.** The laundry portal is disabled behind a build flag and made unreachable. Code
  and tests stay. Shops work offline at their counter.
- **D2 Money model: the v1.2 doc is the source of truth.** Wash&Go's share comes out of the consumer's per-delivery
  fee; there is no commission and no cut on the laundry bill.
  1. Pickup: the customer pays the pickup delivery fee at booking or handoff (online link or cash to the driver),
     recorded on the order. The operator's pickup leg pay and Wash&Go's share are accounted for separately out of
     that fee; the split and amounts are deferred.
  2. Intake: the driver pays the shop from a Wash&Go float (shop advance, Wash&Go working capital), records verified
     weight, laundry amount, receipt photo, intake time, expected ready time. Shop is paid in full, zero commission.
  3. Balance: the customer's account carries the laundry bill (pass-through, exactly the shop's verified amount
     under the booked rate basis and minimum) + the return delivery fee when home return is chosen. Settled by
     payment link after the verified bill, or cash on return within approved limits. Settlement recovers the advance;
     the return fee carries its own operator pay and Wash&Go share.
- **D3 Registration has not happened; no shop has agreed yet; one potential Piaggio operator.** Hosting, dates and
  area deferred. Build proceeds against local and preview environments.
- **Assumptions I am making, correct if wrong:** self-collection is offered in the app as a choice and settled by the
  coordinator at the shop (the app records the choice and the balance; no in-app release flow); drivers are
  hand-picked and admin-created for the pilot (no in-app self-apply); readiness at 3 PM is confirmed by the driver or
  coordinator in the driver app (a "Verified ready" action), not by the shop.

## What changes, in one table

| Area | v1.1 code today | v1.2 pilot |
|---|---|---|
| Booking | Express on demand; Scheduled = single `scheduledPickupAt` instant, no capacity | Day-before booking against admin-opened service days with slot caps and an 8 PM cutoff; Express hidden |
| Shop choice | `/shops` nearest-first, customer may change | Directory of verified pilot shops with rate basis, minimum charge, verified date; algorithmic default, customer choice kept |
| Pricing | wash x rate, 12% commission, ₱7 fee, distance delivery, all computed server-side | Shop rate basis snapshot at booking; one locked quote per leg (pickup, optional return) with Wash&Go's share inside the fee; laundry bill from verified intake, passed through; commission 0, no service fee on the wash |
| Weigh-in | Shop portal weigh sheet | Driver records verified kg, amount, receipt photo at the counter |
| Statuses | 9 statuses, shop drives PROCESSING and READY | Driver and admin drive everything; readiness is a verified event; fulfilment choice and payment status are separate fields |
| Money records | RemittanceLine/Batch (commission model), RiderCashDeposit | Order ledger with typed entries: PICKUP_FEE, SHOP_ADVANCE, LAUNDRY_BILL, RETURN_FEE, ATTEMPT_FEE, REFUND, SETTLEMENT, LEG_PAY, WG_SHARE; customer balance derived |
| Payments | COD rule only | Payment link (admin-pasted URL for the pilot, provider API later) + manual verification; cash on return fallback |
| Operators | Rider role, 5 s polling, no earnings | Same role, relabelled "driver" in UI; manifest by batch; per-leg earnings and attempt fees |
| Admin | Dispatch, applications, config, remittance, rider cash, shops, users, zones | Adds service days, batch planning, operator assignment, intake review, payment verification, advances, reconciliation, customer balances; remittance page hidden |
| Portal | Full console (PR #13) | Disabled by flag |

## Slices

Numbering V0 to V8. Each slice: tests first, Conventional Commits, reviewer after, path-filtered review package.
API and mobile slices run in parallel where paths are disjoint. Amounts are config fields defaulting to 0 with an
admin warning while 0.

### V0 Pilot mode and parking (API + portal + both mobile apps, small)
- Platform config gains `pilotMode` (`V1_1` | `V1_2`, default `V1_1` until the founders flip it) and `/config/booking`
  exposes it. Nothing in V1 to V8 is reachable while `V1_1`.
- Portal: `NEXT_PUBLIC_PORTAL_DISABLED=1` build flag (same `next.config.mjs` env pattern as `NEXT_PUBLIC_DEMO`): every
  route renders a single "Partner portal is not in use during the pilot" page, no API calls, service worker purges.
  The standalone demo build is unaffected. Vercel production env gets the flag; the demo project does not.
- Customer app: Express path hidden when `pilotMode === 'V1_2'`; the booking entry reads "Book a pickup day".
- Admin: remittance page hidden under `V1_2`; a "Pilot v1.2" badge in the header.
- Tests: config round-trip, portal disabled page smoke (Playwright), customer booking entry switch.

### V1 Data model (API, migration `20261120000000_pilot_v1_2`)
- `ServiceDay`: id, date (date only, Asia/Manila), zoneId?, cutoffAt (default date minus 1 day 20:00), slotCap,
  slotsBooked (derived, not stored), open (bool), notes. Unique on date.
- `Shop` gains: `pilotVerified` bool, `ratesVerifiedAt`, `minChargePhp`, `intakeDeadline` (time), `readyByTime`
  (time), `capacityPerDay` (orders), `paymentTrigger` (`AT_INTAKE` | `BEFORE_PROCESSING` | `AT_COLLECTION`),
  `directorySource` (`MANUAL` | `TOMTOM`), `directoryRef` (POI id), `counterNotes`. `commissionPct` stays but is
  forced to 0 under `V1_2`.
- `Order` gains: `serviceDayId`, `rateBasisSnapshot` Json (ratePhp, billingUnit, minChargePhp, ratesVerifiedAt,
  shopName), `pickupQuotePhp`, `returnQuotePhp` (nullable until chosen), `fulfilmentChoice`
  (`UNSET` | `HOME_RETURN` | `SELF_COLLECT`), `fulfilmentChoiceAt`, `paymentStatus` (`UNPAID` | `PICKUP_PAID` |
  `BILL_DUE` | `SETTLED` | `REFUNDED`), `readyVerifiedAt`, `readyVerifiedByUid`, `bagIds` String[], `bagCount`.
- `OrderLeg`: id, orderId, type (`PICKUP` | `RETURN`), operatorId, batchId?, status (`PLANNED` | `DONE` | `FAILED`),
  handoffAt, handoffNote, evidenceKeys String[], quotePhp, legPayPhp, wgSharePhp, attemptFeePhp, createdAt. Unique
  (orderId, type).
- `Batch`: id, serviceDayId, operatorId, kind (`MORNING` | `AFTERNOON`), plannedAt, finalizedAt, routeNotes.
- `Intake`: id, orderId (unique), verifiedKg, billPhp, receiptKey, intakeAt, expectedReadyAt, recordedByUid,
  shopPaidPhp, shopPaidAt, note.
- `LedgerEntry`: id, orderId, type (`PICKUP_FEE` | `SHOP_ADVANCE` | `LAUNDRY_BILL` | `RETURN_FEE` | `ATTEMPT_FEE` |
  `REFUND` | `SETTLEMENT` | `LEG_PAY` | `WG_SHARE`), direction (`CUSTOMER_OWES` | `CUSTOMER_PAID` | `WG_PAID_OUT` |
  `WG_RECEIVED` | `OPERATOR_EARNED`), amountPhp, method (`CASH` | `LINK` | `FLOAT` | `NONE`), reference, recordedByUid,
  createdAt. Customer balance = sum(CUSTOMER_OWES) minus sum(CUSTOMER_PAID) per order and per customer. A completed
  leg writes LEG_PAY (operator) and WG_SHARE (fee minus leg pay) so delivery contribution is read straight off the
  ledger; the laundry bill never carries a Wash&Go line.
- `PaymentRequest`: id, orderId, amountPhp, linkUrl, provider (`MANUAL_LINK` | `PAYMONGO`), status (`OPEN` | `PAID` |
  `VOID`), reference, verifiedByUid, verifiedAt, createdAt.
- `OperatorFloat`: id, operatorId, serviceDayId, issuedPhp, returnedPhp, issuedByUid, reconciledAt. Replaces
  RiderCashDeposit for the pilot; the old table stays.
- Config fields: `pickupQuoteMode` (`FLAT` | `DISTANCE`), `pickupFlatPhp`, `returnFlatPhp`, `attemptFeePhp`,
  `legPayPickupPhp`, `legPayReturnPhp`, `bookingCutoffHour` (20), `returnCutoffTime` (15:30). Wash&Go's share per leg
  is quote minus leg pay, not a separate field. Distance mode reuses `computeDeliveryFee`. `serviceFeePhp`,
  `platformFeePhp` and `commissionPct` are forced to 0 under `V1_2`.
- `packages/domain`: new enums, `PILOT_TIMELINE`, status meta for the new events; parity spec extended.

### V2 Status machine and order rules (API)
- Statuses kept, roles moved: `AT_SHOP → PROCESSING` and `PROCESSING → READY_FOR_RETURN` become RIDER + ADMIN under
  `V1_2` (driver records intake and verified readiness); SHOP roles keep them under `V1_1`.
- New events on the order timeline (not statuses): `INTAKE_RECORDED`, `READY_VERIFIED`, `FULFILMENT_CHOSEN`,
  `PAYMENT_REQUESTED`, `PAYMENT_VERIFIED`, `SELF_COLLECTED` (terminal alongside DELIVERED), `ATTEMPT_FAILED`.
- Booking rules: service day must be open, before cutoff, with free slots and shop capacity; shop must be
  `pilotVerified`; rate basis snapshot and locked quotes written at creation; the laundry amount is shown as an
  estimate at booking ("from ₱X, final at weigh-in") and never carries a Wash&Go line.
- Weigh: `POST /orders/:id/intake` (RIDER, ADMIN) writes `Intake`, recomputes bill from the snapshot (max(rate x kg,
  minCharge)), writes the LAUNDRY_BILL (customer owes) and SHOP_ADVANCE (Wash&Go paid out) ledger entries, moves
  to PROCESSING, emits `BILL_DUE` payment status and an ORDER_UPDATE notification with the amount. Re-intake allowed
  by ADMIN only, audited.
- Readiness: `POST /orders/:id/ready` (RIDER, ADMIN) sets `readyVerifiedAt` and READY_FOR_RETURN.
- Fulfilment: `POST /orders/:id/fulfilment` (CUSTOMER until `returnCutoffTime` of the service day, ADMIN any time)
  sets choice; choosing HOME_RETURN writes `returnQuotePhp` from config and a RETURN_FEE owed entry.
- Legs: `POST /orders/:id/legs/:type/done` and `/failed` (RIDER, ADMIN) with evidence keys; done writes
  LEG_PAY (operator earned) and WG_SHARE (quote minus leg pay); failed writes ATTEMPT_FEE; pickup done also records
  PICKUP_FEE paid (method cash or link) unless already paid online at booking.
- Cancellation: customer may cancel until the service day cutoff; after that ADMIN only; refunds are ledger entries.
- Tests first: transition matrix per pilot mode, booking rule matrix (cutoff, caps, verification), intake math with
  minimum charge, balance derivation, leg pay and attempt fee entries, route-roles spec, Swagger types.

### V3 Directory and service days (API)
- `GET /shops/directory?lat&lng&q`: verified pilot shops first (bookable), then TomTom POI results (`search` in
  `tomtom.provider.ts`, category laundry) marked `bookable: false` with a "not yet verified" label. Admin can promote
  a POI into a Shop (`POST /admin/shops/from-directory`) which copies name, address, lat, lng, `directoryRef`.
- `GET /service-days?from&to` (public, open days with remaining slots); `admin/service-days` CRUD with cutoff and
  cap; closing a day runs the manifest snapshot (orders grouped by shop and area) for batch planning.
- Rate basis maintenance: `PATCH /admin/shops/:id/rates` sets ratePhp per service, `minChargePhp`, `ratesVerifiedAt`
  (defaults to now), `capacityPerDay`, `intakeDeadline`, `readyByTime`, `paymentTrigger`. Every change audited;
  bookings keep their snapshot.

### V4 Customer app (`apps/customer-mobile`)
- Home: next open service days as cards with remaining slots; "Book for Tue 2 Dec".
- Shop step: directory list and map; verified shops show rate basis ("₱25/kg · min ₱100 · rates checked 18 Nov"),
  turnaround "ready by 3 PM"; unverified POIs greyed with "Not yet available". Default = algorithmic pick (capacity,
  distance); customer can change; selection preserved on the order.
- Booking: load size, address, service day, shop, service; estimate block: "Laundry: from ₱X, paid to the shop at
  the rate shown, final at weigh-in · Pickup: ₱Z (locked) · Return: ₱W if you choose home delivery (locked)". Quotes
  are the locked values from the API; the Wash&Go share sits inside them and is not itemised to the customer. Terms
  acceptance with version stamp (from the pilot-ready plan T4).
- Order detail: timeline with intake card (verified kg, bill, receipt photo via presigned GET), balance block
  ("You owe ₱N"), "Pay now" opens `linkUrl` in the browser when a PaymentRequest is OPEN, "Pay cash on return"
  note otherwise; fulfilment choice toggle until the cutoff with the return quote shown; self-collect shows the
  shop address, hours and the sentence "settle your balance with the coordinator".
- Statuses: `PILOT_TIMELINE` labels; payment status chip separate from order status.
- Removed under `V1_2`: Express flow, "change laundry" nearest-first screen (replaced by the directory), COD-only copy.
- Tests: jest for estimate block math and timeline mapping; Playwright on Expo web if it builds, else simulator
  screenshots in the report.

### V5 Driver app (`apps/rider-mobile`, relabelled "Wash&Go Driver")
- Today: manifest grouped by batch (morning pickups, afternoon returns) with shop addresses and customer stops.
- Pickup handoff: bag IDs (scan or type), bag count, photo, pickup fee collected (cash / link already paid), one tap
  "Handed over". Writes the PICKUP leg done.
- Shop intake: verified kg, laundry amount, receipt photo (presign + PUT via a shared `uploadDocument` moved to
  `packages/api-client` or a new `packages/uploads`), expected ready time, "Paid shop ₱N from float" (writes
  SHOP_ADVANCE). Offline-tolerant: form state persists locally until submitted.
- Readiness: "Verified ready" with optional photo.
- Return handoff: cash collected (amount) or "paid online", customer name, photo; writes RETURN leg done and the
  SETTLEMENT entry when cash.
- Failed attempt: reason, photo, time; writes ATTEMPT_FEE.
- Earnings tab replaces "coming soon": legs today, attempt fees, float issued and returned.
- Polling 15 s on the manifest; push stays optional (pilot-ready plan T2 if time allows).

### V6 Admin ops (`apps/admin-dashboard`)
- Service days: calendar list, open/close, cap, cutoff; manifest view after cutoff.
- Shops: pilot verification toggle, rate basis editor with "verified on" stamp, capacity, intake deadline, payment
  trigger; directory promotion from POI.
- Batches: drag or select orders into morning/afternoon batches per operator; finalize; print or share manifest.
- Intake review: list of intakes with receipt photo, kg, bill, advance; flag discrepancies.
- Payments: create PaymentRequest (paste link URL, amount prefilled from balance), mark verified with reference;
  record cash settlements reported by drivers; customer balances list.
- Floats and reconciliation: issue float per operator per day; end-of-day page lists every order's five amounts,
  operator earnings, cash collected, float returned, unresolved items; CSV export.
- Dispatch page: under `V1_2` becomes "Today" (batches and legs) instead of per-order assign.

### V7 Measurement (API + admin)
- `GET /admin/pilot/metrics?from&to`: paid customers, paid repeats (with "had another available day" flag), legs per
  operator shift, on-time pickups / readiness / returns against the configured windows, shop waiting minutes (from
  intake timestamps), staff minutes per order (manual entry field per day), delivery contribution (pickup + return
  fees minus leg pay, attempt fees, transaction fees), advances outstanding, incidents and refunds. CSV export.
- Review thresholds are config fields, blank until the founders set them; the page shows "not set".

### V8 Ops kit (docs + builds)
- `docs/pilot/v1-2-runbook.md`: service-day routine (8 PM close, morning, intake, 3 PM readiness, 3:30 cutoff,
  returns, EOD reconciliation), coordinator checklist, driver checklist, cash and float handling, exception
  procedures (missed handoff, failed attempt, uncollected laundry, refund), what the app records at each step.
- EAS preview builds for driver and customer apps; admin on Vercel; portal disabled flag set.
- Pilot-ready plan T0 (hosting, R2, Firebase, tile key, EAS) stays the prerequisite list; R2 becomes a hard
  dependency because of receipt photos.

## Order of work and sizing
V0 (1 slice) → V1 (1) → V2 (2: rules + legs/ledger) → V3 (1) in series on the API; V4 (2), V5 (2), V6 (3) start as
soon as V1 and V2 ship on a branch, in parallel on disjoint paths; V7 (1) and V8 (1) last. About 14 slices. Branch
`feat/pilot-v1-2` off `main` after PR #13 merges (the portal code it carries is what V0 disables, so #13 should merge
first rather than be abandoned).

## Open items for the founders (not blocking the build)
- Pickup and return quotes: flat per leg or the distance formula; operator leg rates; Wash&Go's share.
- Two service days, the service area, the four-week calendar, slot caps per day.
- Self-collection: in-app choice only (assumed) or a release flow.
- Driver onboarding: admin-created (assumed) or self-apply.
- Readiness check method (assumed: driver or coordinator action in the driver app).
- Registration, hosting, PayMongo account: nothing above goes live without them.

## Superseded or parked
- `docs/plans/2026-10-25-pilot-test-ready.md`: T1 rider self-apply parked (admin-created drivers); T3 shop gaps
  parked with the portal; T5 payments adapter deferred to after the pilot (payment links are manual); T2 earnings
  ledger replaced by LedgerEntry and OrderLeg; T0, T4 terms acceptance, T6 ops kit survive.
- `docs/decisions/2026-10-25-focus-side/README.md`: the bag-price product implications are superseded by D2 (shop
  rate basis passed through, Wash&Go earns on delivery only). The customer-side focus itself stands.
- Shop portal (PR #13): parked behind the flag, kept for a later phase when shops come online.
