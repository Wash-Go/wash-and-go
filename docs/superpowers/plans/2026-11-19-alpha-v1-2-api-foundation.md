# Alpha v1.2 Pilot, Plan A: API Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the v1.2 pilot model into the API and shared packages so the customer, driver and admin apps can be built against frozen interfaces: pilot mode flag, parked portal, service days, verified shop directory, day-before booking with locked quotes, driver-recorded intake, order ledger, legs, fulfilment choice, payment requests, batches and floats.

**Architecture:** One `pilotMode` platform-config value selects v1.1 or v1.2 behaviour at runtime; v1.1 code paths stay intact and tested. New domain objects (ServiceDay, Batch, OrderLeg, Intake, LedgerEntry, PaymentRequest, OperatorFloat) are added beside the existing Order model rather than replacing it; order status stays the nine-value enum, with pilot-specific facts (payment status, fulfilment choice, readiness) as columns and OrderEvents. Money math lives in pure functions under `src/ledger/` with the same style as `src/pricing/`.

**Tech Stack:** NestJS 11 (Fastify), Prisma 6 with hand-written SQL migrations, class-validator DTOs, Jest (unit + `.integration.spec.ts` on real Postgres), `packages/domain` hand-mirrored constants, `packages/api-client` typed methods, Next.js portal flag via `next.config.mjs` env.

**Spec:** `docs/plans/2026-11-19-alpha-v1-2-pilot-app.md` (V0 to V3, and the data model in V1). Operating model source: the founders' Alpha v1.2 Confluence plan (money model D2: Wash&Go share inside the delivery fee, laundry bill passed through, zero commission).

## How the whole programme proceeds (Plans A to D)

1. **Branch.** Merge PR #13 to `main` first (its portal code is what Task 2 parks). Branch `feat/pilot-v1-2` off `main`. Every plan below lands as its own PR into `feat/pilot-v1-2`; that branch goes to `main` when Plan D is done. If #13 cannot merge soon, branch off `feat/portal-full` instead and rebase later.
2. **Plan A (this document), API foundation, 11 tasks, series.** Executor per task, reviewer after each, final-reviewer before the PR. Interfaces frozen at the end of Task 11: Prisma models, DTOs, domain views, api-client methods.
3. **Plans B, C, D in parallel on disjoint paths once Plan A is on the branch:** B customer app (`apps/customer-mobile`), C driver app (`apps/rider-mobile`), D admin (`apps/admin-dashboard`, plus pilot metrics endpoint). Each gets its own plan file in this folder, written against Plan A's Interfaces blocks. Workers run in place; ports 4000/3002 stay Ban's; workers use 4010/3010.
4. **Gates.** No side-specific pricing numbers: every amount is a config field defaulting to 0 with an admin warning. Nothing deploys: hosting, R2, Firebase, registration are founder tracks. Plan A's integration suite runs on `wash_and_go_test` at localhost:5432.
5. **Ledger.** `.superpowers/sdd/2026-11-19-alpha-v1-2/progress.md` is the source of truth; briefs `a1` to `a11`; reports beside them.

## Global Constraints

- API imports workspace packages type-only; runtime constants are hand-mirrored and pinned by `apps/api/src/orders/parity.spec.ts` (text extraction).
- Migrations are hand-written SQL under `apps/api/prisma/migrations/<timestamp>_<name>/migration.sql`; `prisma migrate dev` is broken; apply to `wash_and_go_design` and `wash_and_go_test` on localhost:5432, then `prisma generate`.
- Money columns are `Decimal(12,2)`; all computed pesos round half-up to 2 dp; times are Asia/Manila via `apps/api/src/orders/manila-time.ts`.
- `pnpm --filter @wash-and-go/api build` and `pnpm --filter @wash-and-go/api test` green before every commit; `pnpm -r type-check` green before the PR.
- Every new route appears in `apps/api/src/common/route-swagger.spec.ts` with its roles.
- v1.1 behaviour unchanged when `pilotMode = 0`: the existing unit and integration suites stay green untouched.
- No em dashes in any copy, error message or doc. Commit trailer exactly `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`, commits via `git commit -F <file>`, explicit `git add` of named paths, no checkout, reset, stash or worktree in the shared checkout.

## Review Focus

- Booking at the cutoff boundary: a booking at 19:59:59 Asia/Manila the day before is accepted, 20:00:00 is refused; a UTC comparison would shift this by 8 hours. Pinned in Task 4 (`serviceDayCutoff`) and Task 6.
- Slot cap race: two bookings for the last slot in the same second; exactly one succeeds. Pinned in Task 6 integration test with a row lock on ServiceDay.
- Intake recorded twice (double tap, retry): one Intake row, one LAUNDRY_BILL and one SHOP_ADVANCE entry; the second call returns 409 unless ADMIN re-intake, which supersedes and audits. Pinned in Task 8.
- Leg completed twice: idempotent, one LEG_PAY and one WG_SHARE entry; a failed attempt followed by a completed leg keeps both the ATTEMPT_FEE and the LEG_PAY. Pinned in Task 9.
- Minimum charge: 2.4 kg at ₱25/kg with a ₱100 minimum bills ₱100, not ₱60; rounding at 2 dp. Pinned in Task 7.

---

### Task 1: `pilotMode` platform config and booking config exposure

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (PlatformConfig: add `pilotMode Int @default(0)`)
- Create: `apps/api/prisma/migrations/20261120000000_pilot_mode/migration.sql`
- Modify: `apps/api/src/platform-config/platform-config.service.ts` (CONFIG_FIELDS, defaults, BookingConfig, invariants)
- Modify: `apps/api/src/platform-config/platform-config.service.spec.ts`
- Modify: `packages/domain/src/types.ts` (`BookingConfigView`)
- Test: `apps/api/src/platform-config/platform-config.service.spec.ts`

**Interfaces:**
- Produces: `CONFIG_FIELDS` gains `'pilotMode'` (0 = v1.1, 1 = v1.2). `BookingConfig` and domain `BookingConfigView` gain `pilotMode: 'V1_1' | 'V1_2'`. `PlatformConfigService.isPilotV12(): Promise<boolean>`. `PlatformConfigValues.pilotMode: number`.

- [ ] **Step 1: Write the failing tests** in `platform-config.service.spec.ts`:
  `it('exposes pilotMode as V1_1 by default in the booking config')` asserts `getBookingConfig()` resolves `{ expressWeightThresholdKg: 6, pilotMode: 'V1_1' }`; `it('maps pilotMode 1 to V1_2')`; `it('rejects pilotMode outside 0 or 1')` expects `BadRequestException` from `update({ pilotMode: 2 })`.
- [ ] **Step 2: Run** `pnpm --filter @wash-and-go/api test:unit -- platform-config` and confirm the three fail.
- [ ] **Step 3: Migration** `ALTER TABLE "PlatformConfig" ADD COLUMN "pilotMode" INTEGER NOT NULL DEFAULT 0;` with a comment line naming the plan. Apply to both local DBs, `prisma generate`.
- [ ] **Step 4: Implement**: add `'pilotMode'` to `CONFIG_FIELDS`, default `this.envNum('PILOT_MODE', 0)`, `pilotMode` in `PlatformConfigValues`, `assertConfigInvariants` gains `pilotMode` must be 0 or 1, `getBookingConfig()` returns `pilotMode: row.pilotMode === 1 ? 'V1_2' : 'V1_1'`, `isPilotV12()` reads the row. Mirror `pilotMode: 'V1_1' | 'V1_2'` on `BookingConfigView`.
- [ ] **Step 5: Run** unit suite for platform-config and `pnpm --filter @wash-and-go/api build`; all green.
- [ ] **Step 6: Commit** `feat(api): pilotMode platform config with booking exposure`.

### Task 2: Park the laundry portal behind a build flag

**Files:**
- Modify: `apps/laundry-portal/next.config.mjs` (env block, add `NEXT_PUBLIC_PORTAL_DISABLED`)
- Create: `apps/laundry-portal/components/PortalParked.tsx`
- Modify: `apps/laundry-portal/app/layout.tsx` (render `PortalParked` and skip providers when the flag is `'1'`)
- Modify: `apps/laundry-portal/public/sw.js` or the SW registration in `lib/` (skip registration and purge caches when disabled; find the existing registration file first)
- Create: `e2e/tests/laundry-portal-parked.spec.ts`
- Modify: `e2e/package.json` (script `build:portal-parked`: `NEXT_PUBLIC_PORTAL_DISABLED=1 NEXT_DIST_DIR=.next-parked next build`)

**Interfaces:**
- Produces: env `NEXT_PUBLIC_PORTAL_DISABLED` (`'1'` | `'0'`), inlined like `NEXT_PUBLIC_DEMO`. Demo build unaffected (`NEXT_PUBLIC_DEMO=1` wins when both set; document in a comment).

- [ ] **Step 1: Write the failing Playwright spec**: visiting `/`, `/login`, `/orders`, `/help` on the parked build each shows the heading "Partner portal is not in use during the pilot", no request to `/auth/session` or `/orders` is made (assert on `page.on('request')`), and `navigator.serviceWorker.getRegistrations()` resolves empty after load.
- [ ] **Step 2: Run** `pnpm --filter e2e exec playwright test laundry-portal-parked` against a normal build on :3010 and confirm it fails.
- [ ] **Step 3: Implement** `PortalParked` (DESIGN.md tokens, whale mark, one paragraph, no links), the layout branch, the SW skip and cache purge, the env entry, the e2e script.
- [ ] **Step 4: Run** the parked spec on the parked build and the existing portal shell spec on a normal build; both green. `pnpm --filter @wash-and-go/laundry-portal test` green.
- [ ] **Step 5: Commit** `feat(portal): park the portal behind NEXT_PUBLIC_PORTAL_DISABLED`.

### Task 3: v1.2 schema: models, enums, columns, domain mirrors

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20261120010000_pilot_v1_2_models/migration.sql`
- Modify: `packages/domain/src/order-status.ts` (new enums as const arrays), `packages/domain/src/types.ts` (views, see Interfaces)
- Modify: `apps/api/src/orders/parity.spec.ts` (pin new enums to Prisma)
- Create: `apps/api/src/pilot/pilot-schema.integration.spec.ts`

**Interfaces:**
- Produces Prisma models (all ids `cuid()`, money `Decimal(12,2)`, timestamps `DateTime`):
  - `ServiceDay { id, date DateTime @db.Date @unique, zoneId String?, cutoffAt DateTime, slotCap Int, open Boolean @default(true), notes String?, createdAt }`
  - `Batch { id, serviceDayId, operatorId, kind BatchKind, plannedAt DateTime?, finalizedAt DateTime?, routeNotes String?, createdAt }`; `enum BatchKind { MORNING AFTERNOON }`
  - `OrderLeg { id, orderId, type LegType, operatorId String?, batchId String?, status LegStatus @default(PLANNED), handoffAt, handoffNote, evidenceKeys String[], quotePhp, legPayPhp, wgSharePhp, attemptFeePhp, createdAt; @@unique([orderId, type]) }`; `enum LegType { PICKUP RETURN }`; `enum LegStatus { PLANNED DONE FAILED }`
  - `Intake { id, orderId @unique, verifiedKg Decimal(6,2), billPhp, receiptKey String?, intakeAt, expectedReadyAt DateTime?, recordedByUid, shopPaidPhp, shopPaidAt DateTime?, note String?, supersededAt DateTime? }`
  - `LedgerEntry { id, orderId, type LedgerType, direction LedgerDirection, amountPhp, method PayMethod @default(NONE), reference String?, recordedByUid, idempotencyKey String? @unique, createdAt; @@index([orderId]) }`; `enum LedgerType { PICKUP_FEE SHOP_ADVANCE LAUNDRY_BILL RETURN_FEE ATTEMPT_FEE REFUND SETTLEMENT LEG_PAY WG_SHARE }`; `enum LedgerDirection { CUSTOMER_OWES CUSTOMER_PAID WG_PAID_OUT WG_RECEIVED OPERATOR_EARNED }`; `enum PayMethod { CASH LINK FLOAT NONE }`
  - `PaymentRequest { id, orderId, amountPhp, linkUrl String, provider PaymentProvider @default(MANUAL_LINK), status PaymentRequestStatus @default(OPEN), reference String?, verifiedByUid String?, verifiedAt DateTime?, createdAt }`; `enum PaymentProvider { MANUAL_LINK PAYMONGO }`; `enum PaymentRequestStatus { OPEN PAID VOID }`
  - `OperatorFloat { id, operatorId, serviceDayId, issuedPhp, returnedPhp @default(0), issuedByUid, reconciledAt DateTime?, createdAt }`
  - `Order` adds: `serviceDayId String?`, `rateBasisSnapshot Json?`, `pickupQuotePhp Decimal(12,2) @default(0)`, `returnQuotePhp Decimal(12,2)?`, `fulfilmentChoice FulfilmentChoice @default(UNSET)`, `fulfilmentChoiceAt`, `paymentStatus PaymentStatus @default(UNPAID)`, `readyVerifiedAt`, `readyVerifiedByUid`, `bagIds String[]`, `bagCount Int?`; `enum FulfilmentChoice { UNSET HOME_RETURN SELF_COLLECT }`; `enum PaymentStatus { UNPAID PICKUP_PAID BILL_DUE SETTLED REFUNDED }`
  - `Shop` adds: `pilotVerified Boolean @default(false)`, `ratesVerifiedAt`, `minChargePhp Decimal(12,2) @default(0)`, `intakeDeadline String?` ("HH:mm"), `readyByTime String?`, `capacityPerDay Int @default(0)`, `paymentTrigger PaymentTrigger @default(AT_INTAKE)`, `directorySource DirectorySource @default(MANUAL)`, `directoryRef String?`, `counterNotes String?`; `enum PaymentTrigger { AT_INTAKE BEFORE_PROCESSING AT_COLLECTION }`; `enum DirectorySource { MANUAL TOMTOM }`
  - `PlatformConfig` adds numeric fields: `pickupQuoteMode Int @default(0)` (0 flat, 1 distance), `pickupFlatPhp`, `returnFlatPhp`, `attemptFeePhp`, `legPayPickupPhp`, `legPayReturnPhp` (all `Decimal(12,2) @default(0)`), `bookingCutoffHour Int @default(20)`, `returnCutoffMinutes Int @default(930)` (minutes after midnight, 15:30).
- Produces domain const arrays with the same names and values (`LEG_TYPES`, `LEG_STATUSES`, `LEDGER_TYPES`, `LEDGER_DIRECTIONS`, `PAY_METHODS`, `PAYMENT_REQUEST_STATUSES`, `FULFILMENT_CHOICES`, `PAYMENT_STATUSES`, `PAYMENT_TRIGGERS`, `BATCH_KINDS`) and view types `ServiceDayView`, `OrderLegView`, `IntakeView`, `LedgerEntryView`, `PaymentRequestView`, `OperatorFloatView`, `BalanceView { orderId?: string; owedPhp: number; paidPhp: number; balancePhp: number }`, `RateBasisSnapshot { ratePhp: number; billingUnit: BillingUnit; minChargePhp: number; ratesVerifiedAt: string; shopName: string }`, and `OrderView` extended with the new Order columns (numbers as `number`, dates as ISO strings).

- [ ] **Step 1: Extend `parity.spec.ts`** with one `it` per new enum: domain array equals `Object.values(PrismaEnum)`; run, confirm failures.
- [ ] **Step 2: Write `pilot-schema.integration.spec.ts`**: creates one ServiceDay, Batch, OrderLeg (via an existing order fixture helper in `src/orders/orders.integration.spec.ts`, reuse its setup), Intake, LedgerEntry, PaymentRequest, OperatorFloat; asserts the unique constraints (`OrderLeg (orderId,type)`, `Intake orderId`, `LedgerEntry idempotencyKey`) reject duplicates with P2002.
- [ ] **Step 3: Write the migration SQL** (enums, tables, columns, indexes, foreign keys to Order, Shop, User, ServiceDay, Batch) and the schema changes; apply to both DBs; `prisma generate`.
- [ ] **Step 4: Add the domain arrays and views**; `pnpm --filter @wash-and-go/domain test` green.
- [ ] **Step 5: Run** `pnpm --filter @wash-and-go/api test` (unit + integration, `DATABASE_URL=postgresql://ban@localhost:5432/wash_and_go_test`) and the build; green.
- [ ] **Step 6: Commit** `feat(api): v1.2 pilot schema (service days, legs, intake, ledger, payments, floats)`.

### Task 4: Service days module

**Files:**
- Create: `apps/api/src/service-days/service-days.module.ts`, `service-days.service.ts`, `service-days.controller.ts` (public read), `admin-service-days.controller.ts`, `dto/service-days.dto.ts`, `service-day-cutoff.ts` (pure)
- Test: `apps/api/src/service-days/service-day-cutoff.spec.ts`, `service-days.service.spec.ts`, `service-days.integration.spec.ts`
- Modify: `apps/api/src/app.module.ts` (import module)

**Interfaces:**
- Produces: `serviceDayCutoff(date: string /* YYYY-MM-DD */, cutoffHour: number): Date` (Asia/Manila, previous day at `cutoffHour:00`). `ServiceDaysService.listOpen(from?: string, to?: string): Promise<ServiceDayView[]>` (open days with `remainingSlots`), `create(dto)`, `update(id, dto)`, `close(id)` (sets `open=false`), `manifest(id): Promise<ManifestView>` (orders on that day grouped by shopId, each with pickup address, load, customer name). Routes: `GET /service-days?from&to` (CUSTOMER, RIDER, ADMIN), `GET /admin/service-days`, `POST /admin/service-days`, `PATCH /admin/service-days/:id`, `POST /admin/service-days/:id/close`, `GET /admin/service-days/:id/manifest` (ADMIN).
- DTO: `CreateServiceDayDto { date: string (YYYY-MM-DD, @Matches), slotCap: number (@IsInt @Min(0)), zoneId?: string, notes?: string, cutoffAt?: string (ISO; default from config) }`.

- [ ] **Step 1: Write `service-day-cutoff.spec.ts`**: `serviceDayCutoff('2026-12-02', 20)` equals `2026-12-01T12:00:00.000Z`; `serviceDayCutoff('2026-12-02', 18)` equals `2026-12-01T10:00:00.000Z`; invalid date throws.
- [ ] **Step 2: Run, confirm fail; implement using `manila-time.ts` helpers; run, pass.**
- [ ] **Step 3: Write `service-days.service.spec.ts`** (Prisma mocked as in `platform-config.service.spec.ts`): `listOpen` filters `open=true` and future dates, computes `remainingSlots = slotCap - count(orders where serviceDayId and status != CANCELLED)`; `create` with no `cutoffAt` uses `bookingCutoffHour` from config; `close` sets `open=false`.
- [ ] **Step 4: Write `service-days.integration.spec.ts`**: create two days, one closed; `GET /service-days` lists only the open one; duplicate date returns 409.
- [ ] **Step 5: Implement module, service, controllers, DTOs; register in `app.module.ts`; add routes to `route-swagger.spec.ts`.**
- [ ] **Step 6: Run** unit, integration, build; green. **Commit** `feat(api): service days with cutoff and manifest`.

### Task 5: Shop pilot fields, rate maintenance, directory

**Files:**
- Modify: `apps/api/src/shops/dto/admin-shops.dto.ts` (add `UpdateShopPilotDto`), `admin-shops.controller.ts` (`PATCH :id/pilot`, `POST from-directory`), `admin-shops.service.ts`
- Create: `apps/api/src/shops/shop-directory.service.ts`, `shop-directory.ts` (pure merge), `shop-directory.controller.ts` (`GET /shops/directory`)
- Modify: `apps/api/src/shops/shops.service.ts` (`ShopView` gains `pilotVerified`, `minChargePhp`, `ratesVerifiedAt`, `readyByTime`), `packages/domain/src/types.ts` (`DirectoryItemView`)
- Test: `apps/api/src/shops/shop-directory.spec.ts`, `admin-shops.service.spec.ts` (extend), `shops-module-wiring.spec.ts` (extend)

**Interfaces:**
- Produces: `UpdateShopPilotDto { pilotVerified?: boolean; minChargePhp?: number; capacityPerDay?: number; intakeDeadline?: string; readyByTime?: string; paymentTrigger?: PaymentTrigger; counterNotes?: string; rates?: { serviceId: string; ratePhp: number }[] }`; saving `rates` or `minChargePhp` sets `ratesVerifiedAt = now()` and writes one `ConfigAudit` row per changed field with `field = 'shop:<shopId>:<field>'` (reuse the existing audit writer; no new table). `DirectoryItemView { source: 'SHOP' | 'TOMTOM'; shopId?: string; directoryRef?: string; name; address; lat; lng; distanceKm; bookable: boolean; rateBasis?: RateBasisSnapshot; readyByTime?: string }`. `mergeDirectory(shops: ShopView[], pois: PoiResult[], origin): DirectoryItemView[]` (pure: verified shops first by distance, then POIs not within 50 m of a known shop, de-duplicated by `directoryRef`). Route `GET /shops/directory?lat&lng&q` (CUSTOMER, ADMIN). `POST /admin/shops/from-directory { directoryRef, name, address, lat, lng }` creates a DRAFT shop with `directorySource=TOMTOM`.

- [ ] **Step 1: Write `shop-directory.spec.ts`**: verified shops sort first; a POI within 50 m of a shop is dropped; unverified shops appear `bookable:false`; `q` filters by name case-insensitively.
- [ ] **Step 2: Run, fail; implement `mergeDirectory`; pass.**
- [ ] **Step 3: Extend `admin-shops.service.spec.ts`**: `updatePilot` stamps `ratesVerifiedAt` when rates change and leaves it when only `counterNotes` changes; rejects `minChargePhp < 0`; `fromDirectory` creates a DRAFT shop and refuses a duplicate `directoryRef` (409).
- [ ] **Step 4: Implement service methods, controller routes, `ShopsService` view fields, TomTom `search` call for POIs (category "laundry", limit 10, graceful empty on provider error), routes in `route-swagger.spec.ts`.**
- [ ] **Step 5: Run** unit, build; **commit** `feat(api): shop pilot fields, rate maintenance and directory`.

### Task 6: v1.2 booking path with locked quotes

**Files:**
- Modify: `apps/api/src/orders/dto/orders.dto.ts` (`CreateOrderDto.serviceDayId?: string`)
- Create: `apps/api/src/pricing/quote-leg.ts` (pure), `apps/api/src/orders/pilot-booking.ts` (pure validation helpers)
- Modify: `apps/api/src/orders/orders.service.ts` (`createPilotOrder`, dispatch from `POST /orders` when `pilotMode` is V1_2), `orders.repository.ts` (lock ServiceDay row, count orders on day)
- Test: `apps/api/src/pricing/quote-leg.spec.ts`, `apps/api/src/orders/pilot-booking.spec.ts`, `orders.service.spec.ts` (extend), `orders.integration.spec.ts` (extend)

**Interfaces:**
- Produces: `quoteLeg(cfg: { mode: 0|1; flatPhp: number; delivery: DeliveryConfig }, km: number): Prisma.Decimal` (mode 0 returns flat; mode 1 returns `computeDeliveryFee`). `OrdersService.createPilotOrder(actor: User, dto: CreateOrderDto, idempotencyKey?: string): Promise<Order>` requiring `dto.serviceDayId`; writes `rateBasisSnapshot`, `pickupQuotePhp`, `returnQuotePhp = null`, `washValuePhp = max(rate x estimateKg, minCharge)` as the estimate, `commissionPhp = 0`, `serviceFeePhp = 0`, `customerTotalPhp = pickupQuotePhp + washValuePhp`, status BOOKED, OrderEvent meta `{ serviceDayId, pickupQuotePhp }`. Errors: `409 'Bookings for this day are closed'` (after `cutoffAt` or `open=false`), `409 'No slots left for this day'`, `400 'Shop is not available for the pilot'` (not `pilotVerified`), `409 'Shop capacity reached for this day'`.

- [ ] **Step 1: Write `quote-leg.spec.ts`**: flat mode ignores km; distance mode equals `computeDeliveryFee`; result has 2 dp.
- [ ] **Step 2: Write `pilot-booking.spec.ts`** for `assertBookable(day, nowManila, bookedCount)`: 19:59:59 the day before passes, 20:00:00 fails with the closed message, `bookedCount >= slotCap` fails with the slots message.
- [ ] **Step 3: Run both, fail; implement the pure functions; pass.**
- [ ] **Step 4: Extend `orders.service.spec.ts`**: `createPilotOrder` snapshot fields, zero commission and service fee, estimate uses the minimum charge (2.4 kg x 25 with min 100 gives 100), shop not verified rejected.
- [ ] **Step 5: Extend `orders.integration.spec.ts`**: service day with `slotCap=1`; two concurrent `POST /orders` with different idempotency keys; exactly one 201 and one 409 (use `Promise.all`; repository takes `SELECT ... FOR UPDATE` on the ServiceDay row inside the transaction).
- [ ] **Step 6: Implement `createPilotOrder`, the controller dispatch (`pilotMode` V1_2 and `serviceDayId` present), the repository lock and count; keep `createExpressOrder` and `createScheduledOrder` untouched.**
- [ ] **Step 7: Run** unit, integration, build; **commit** `feat(api): v1.2 booking against service days with locked quotes`.

### Task 7: Ledger math and ledger service

**Files:**
- Create: `apps/api/src/ledger/ledger-math.ts` (pure), `ledger.service.ts`, `ledger.module.ts`
- Test: `apps/api/src/ledger/ledger-math.spec.ts`, `ledger.service.spec.ts`

**Interfaces:**
- Produces: `intakeBill(snapshot: RateBasisSnapshot, verifiedKg: number): Prisma.Decimal` (PER_KG: `max(round2(rate x kg), minCharge)`; PER_PIECE and FLAT: `max(rate, minCharge)`); `legSplit(quotePhp, legPayPhp): { legPayPhp, wgSharePhp }` (share = quote minus leg pay, floor 0); `customerBalance(entries: LedgerEntryLike[]): BalanceView` (owed = sum CUSTOMER_OWES, paid = sum CUSTOMER_PAID). `LedgerService.record(tx, entry: { orderId, type, direction, amountPhp, method?, reference?, recordedByUid, idempotencyKey? }): Promise<LedgerEntry>` (returns the existing row on a duplicate `idempotencyKey`); `LedgerService.balanceForOrder(orderId)`, `balanceForCustomer(customerId)`.

- [ ] **Step 1: Write `ledger-math.spec.ts`**: 2.4 kg at 25 with min 100 is 100.00; 6.37 kg at 25 is 159.25; PER_PIECE 3 pieces at 120 with min 0 is 360.00 (pieces passed as `verifiedKg` count, documented); `legSplit(40, 30)` is `{30, 10}`; `legSplit(40, 45)` is `{45, 0}`; `customerBalance` with owed 159.25 + 40 and paid 40 is `balancePhp 159.25`.
- [ ] **Step 2: Run, fail; implement; pass.**
- [ ] **Step 3: Write `ledger.service.spec.ts`**: `record` twice with the same `idempotencyKey` creates one row and returns it both times; `balanceForOrder` sums only that order.
- [ ] **Step 4: Implement service and module; run; commit** `feat(api): ledger math and ledger service`.

### Task 8: Intake and readiness (driver drives the shop steps)

**Files:**
- Modify: `apps/api/src/orders/order-status.ts` (add `TRANSITIONS_V1_2` where `AT_SHOP → PROCESSING` and `PROCESSING → READY_FOR_RETURN` allow `RIDER` and `ADMIN` only; export `transitionsFor(pilot: boolean)`; existing exported functions take an optional `pilot` flag defaulting to false)
- Modify: `apps/api/src/orders/dto/orders.dto.ts` (`IntakeDto`), `orders.controller.ts` (`POST :id/intake`, `POST :id/ready`), `orders.service.ts` (`recordIntake`, `verifyReady`)
- Test: `order-status.spec.ts` (extend), `orders.service.spec.ts` (extend), `orders.integration.spec.ts` (extend)

**Interfaces:**
- Produces: `IntakeDto { verifiedKg: number (@IsPositive, max 50), receiptKey?: string (owned-key check reused from uploads), expectedReadyAt?: string (ISO), shopPaidPhp: number (@Min(0)), note?: string }`. `OrdersService.recordIntake(actor, orderId, dto): Promise<OrderView>`: requires status AT_SHOP (or PROCESSING for ADMIN re-intake), writes Intake (supersedes the previous one by setting `supersededAt`), ledger `LAUNDRY_BILL CUSTOMER_OWES billPhp` and `SHOP_ADVANCE WG_PAID_OUT shopPaidPhp method FLOAT`, both with idempotency keys `intake:<orderId>:bill:<n>` and `intake:<orderId>:advance:<n>`, sets `weightKg`, `washValuePhp = billPhp`, `customerTotalPhp = pickupQuotePhp + billPhp + (returnQuotePhp ?? 0)`, `paymentStatus = BILL_DUE`, status PROCESSING, OrderEvent meta `{ verifiedKg, billPhp, receiptKey }`, ORDER_UPDATE notification "Your laundry weighed X kg. Bill ₱Y." `verifyReady(actor, orderId)`: PROCESSING → READY_FOR_RETURN, `readyVerifiedAt`, `readyVerifiedByUid`. Second `recordIntake` by RIDER returns `409 'Intake already recorded'`.

- [ ] **Step 1: Extend `order-status.spec.ts`**: under pilot, RIDER may drive `AT_SHOP → PROCESSING` and `PROCESSING → READY_FOR_RETURN`; SHOP_OWNER may not; under non-pilot the old matrix holds unchanged (table-driven over both modes).
- [ ] **Step 2: Extend `orders.service.spec.ts`**: intake math via `intakeBill`; two ledger entries written; `paymentStatus BILL_DUE`; rider second call 409; admin re-intake supersedes and writes new entries with `:2` keys; `verifyReady` from AT_SHOP is 409.
- [ ] **Step 3: Extend integration**: full path BOOKED → ASSIGNED → PICKED_UP → AT_SHOP → intake → ready with a RIDER token under `pilotMode=1`; `GET /orders/:id` shows `intake` and `balance`.
- [ ] **Step 4: Implement; add routes to the swagger matrix; run all; commit** `feat(api): driver intake and verified readiness`.

### Task 9: Legs, fulfilment choice, payment requests, settlement

**Files:**
- Create: `apps/api/src/orders/legs.service.ts`, `apps/api/src/payments/payment-requests.service.ts`, `payment-requests.controller.ts` (admin), `payments.module.ts`, `apps/api/src/orders/dto/legs.dto.ts`
- Modify: `orders.controller.ts` (`POST :id/legs/:type/done`, `POST :id/legs/:type/failed`, `POST :id/fulfilment`), `orders.service.ts` (delegations), `apps/api/src/users/` (new `GET /me/balance`)
- Test: `legs.service.spec.ts`, `payment-requests.service.spec.ts`, `orders.integration.spec.ts` (extend)

**Interfaces:**
- Produces: `LegDoneDto { handoffNote?: string; evidenceKeys?: string[]; cashCollectedPhp?: number; bagIds?: string[]; bagCount?: number }`, `LegFailedDto { reason: string; evidenceKeys?: string[] }`, `FulfilmentDto { choice: 'HOME_RETURN' | 'SELF_COLLECT' }`, `CreatePaymentRequestDto { amountPhp?: number (default = balance), linkUrl: string (@IsUrl https) }`, `VerifyPaymentRequestDto { reference: string }`.
  `LegsService.complete(actor, orderId, type, dto)`: does not change order status (status transitions stay explicit via `POST :id/status`); it writes `OrderLeg.status DONE`, `handoffAt`, `LEG_PAY OPERATOR_EARNED legPayPhp`, `WG_SHARE WG_RECEIVED wgSharePhp` (from `legSplit(quote, config legPay)`), and for PICKUP `PICKUP_FEE CUSTOMER_PAID quote method CASH|LINK` unless a PaymentRequest already covered it; for RETURN with `cashCollectedPhp`, `SETTLEMENT CUSTOMER_PAID cash method CASH` and `paymentStatus SETTLED` when balance reaches 0. Idempotency keys `leg:<orderId>:<type>:pay`, `:share`, `:fee`. `fail(actor, orderId, type, dto)`: `OrderLeg.status FAILED`, `ATTEMPT_FEE OPERATOR_EARNED attemptFeePhp`, OrderEvent `ATTEMPT_FAILED`; a later `complete` resets status to DONE and keeps the attempt entry.
  `OrdersService.chooseFulfilment(actor, orderId, dto)`: CUSTOMER allowed while `now < serviceDay.date + returnCutoffMinutes` (Manila), ADMIN any time; HOME_RETURN sets `returnQuotePhp = quoteLeg(returnCfg, km)` and writes `RETURN_FEE CUSTOMER_OWES`; SELF_COLLECT clears any unpaid RETURN_FEE by a `REFUND` entry of equal amount; sets `fulfilmentChoice`, `fulfilmentChoiceAt`, OrderEvent `FULFILMENT_CHOSEN`.
  `PaymentRequestsService.create(admin, orderId, dto)` (one OPEN per order), `verify(admin, id, dto)`: `SETTLEMENT CUSTOMER_PAID amount method LINK reference`, PaymentRequest PAID, `paymentStatus SETTLED` when balance is 0. Routes: `POST /admin/orders/:id/payment-requests`, `POST /admin/payment-requests/:id/verify`, `POST /admin/payment-requests/:id/void` (ADMIN); `GET /me/balance` (CUSTOMER) returns `BalanceView` per open order plus total.

- [ ] **Step 1: Write `legs.service.spec.ts`**: complete writes LEG_PAY and WG_SHARE once (second call no new rows, 200); fail then complete keeps ATTEMPT_FEE; RETURN with cash writes SETTLEMENT and flips `paymentStatus` to SETTLED only when balance hits 0; PICKUP done after a PAID pickup PaymentRequest writes no PICKUP_FEE.
- [ ] **Step 2: Write `payment-requests.service.spec.ts`**: second OPEN request for the same order is 409; verify writes SETTLEMENT with the reference; void leaves the balance unchanged.
- [ ] **Step 3: Extend `orders.service.spec.ts`**: fulfilment cutoff boundary 15:29:59 passes, 15:30:00 fails for CUSTOMER, passes for ADMIN; HOME_RETURN writes RETURN_FEE; switching to SELF_COLLECT refunds it.
- [ ] **Step 4: Extend integration**: end-to-end v1.2 order through intake, fulfilment HOME_RETURN, payment request verified, return leg done; `GET /me/balance` is 0; ledger has exactly 8 entries (PICKUP_FEE, LEG_PAY x2, WG_SHARE x2, LAUNDRY_BILL, SHOP_ADVANCE, RETURN_FEE, SETTLEMENT; count and assert types).
- [ ] **Step 5: Implement; swagger matrix; run all; commit** `feat(api): legs, fulfilment choice, payment requests and settlement`.

### Task 10: Batches, manifest for drivers, operator floats

**Files:**
- Create: `apps/api/src/batches/batches.module.ts`, `batches.service.ts`, `admin-batches.controller.ts`, `me-manifest.controller.ts`, `dto/batches.dto.ts`; `apps/api/src/floats/floats.module.ts`, `floats.service.ts`, `admin-floats.controller.ts`, `me-floats.controller.ts`
- Test: `batches.service.spec.ts`, `floats.service.spec.ts`, `batches.integration.spec.ts`

**Interfaces:**
- Produces: `CreateBatchDto { serviceDayId: string; operatorId: string; kind: 'MORNING' | 'AFTERNOON'; routeNotes?: string }`, `AssignLegsDto { orderIds: string[] }`. `BatchesService.create`, `assign(batchId, orderIds)` (creates or updates `OrderLeg` of type PICKUP for MORNING, RETURN for AFTERNOON, with `operatorId` and `batchId`, status PLANNED; sets the order's `assignedRiderId` and moves BOOKED → ASSIGNED for MORNING), `finalize(batchId)`, `manifestFor(operatorId, date): Promise<ManifestView>` (legs grouped by batch kind, each with order code, customer name, address, shop name and address, bag info, quote, status). Routes: `POST /admin/batches`, `POST /admin/batches/:id/assign`, `POST /admin/batches/:id/finalize`, `GET /admin/batches?serviceDayId` (ADMIN); `GET /me/manifest?date=YYYY-MM-DD` (RIDER).
  `FloatsService.issue(admin, { operatorId, serviceDayId, issuedPhp })`, `reconcile(admin, id, { returnedPhp })`, `forOperator(operatorId, date)`. Routes `POST /admin/floats`, `POST /admin/floats/:id/reconcile`, `GET /admin/floats?serviceDayId` (ADMIN), `GET /me/float?date` (RIDER). Reconcile computes `expectedReturnPhp = issuedPhp - sum(SHOP_ADVANCE method FLOAT by that operator's legs that day) + sum(CUSTOMER_PAID method CASH collected by that operator that day)` and stores the variance on the response.

- [ ] **Step 1: Write `batches.service.spec.ts`**: assign to a MORNING batch creates PICKUP legs and moves BOOKED → ASSIGNED; assigning an order from another service day is 400; finalize twice is 409; manifest groups by kind and orders by shop then address.
- [ ] **Step 2: Write `floats.service.spec.ts`**: `expectedReturnPhp` arithmetic with one advance of 150 and one cash collection of 199.25 on an issued 1,000 float equals 1,049.25; variance equals `returnedPhp - expectedReturnPhp`.
- [ ] **Step 3: Write `batches.integration.spec.ts`**: admin creates day, two orders, one batch, assigns both; rider `GET /me/manifest` lists two PICKUP legs; another rider gets an empty manifest.
- [ ] **Step 4: Implement modules, register in `app.module.ts`, swagger matrix; run all; commit** `feat(api): batches, driver manifest and operator floats`.

### Task 11: Views, api-client methods, Swagger response types, final parity

**Files:**
- Modify: `apps/api/src/orders/orders.service.ts` (`OrderView` serialiser includes `intake`, `legs`, `balance`, `paymentRequests` (OPEN only for customers), new columns), the Swagger response classes under `apps/api/src/common/` used by `route-swagger.spec.ts`
- Modify: `packages/api-client/src/client.ts` (+ `client.spec.ts`): `getServiceDays(from?, to?)`, `getDirectory({lat,lng,q?})`, `createOrder` body gains `serviceDayId`, `recordIntake(orderId, body)`, `verifyReady(orderId)`, `completeLeg(orderId, type, body)`, `failLeg(orderId, type, body)`, `chooseFulfilment(orderId, choice)`, `getMyBalance()`, `getMyManifest(date)`, `getMyFloat(date)`, admin: `adminServiceDays*`, `adminUpdateShopPilot`, `adminCreateShopFromDirectory`, `adminBatches*`, `adminFloats*`, `adminCreatePaymentRequest`, `adminVerifyPaymentRequest`, `adminVoidPaymentRequest`
- Modify: `packages/domain/src/types.ts` (`ManifestView`, `CreateOrderBody.serviceDayId?`)
- Test: `packages/api-client/src/client.spec.ts`, `apps/api/src/common/route-swagger.spec.ts`, `apps/api/src/orders/parity.spec.ts`

- [ ] **Step 1: Extend `client.spec.ts`** with one test per new method asserting method, path, query and body shape (follow the existing pattern).
- [ ] **Step 2: Run, fail; implement the client methods and view types; pass.**
- [ ] **Step 3: Extend the API `OrderView` serialiser and Swagger response classes; `route-swagger.spec.ts` lists every v1.2 route with roles; run `pnpm --filter @wash-and-go/api test`, `pnpm -r type-check`, `pnpm -r build`.**
- [ ] **Step 4: Commit** `feat(api,client): v1.2 views and client methods`.
- [ ] **Step 5: Update the SDD ledger, write `a11-report.md`, request the final-reviewer on `git diff main..HEAD -- apps/api packages e2e apps/laundry-portal`, open the PR to `feat/pilot-v1-2` with the body ending `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.**

---

## Plans B, C, D (to be written against Task 11's interfaces)

- **Plan B, customer app** (`apps/customer-mobile`): service-day cards; directory screen replacing `change-laundry.tsx`; booking with `serviceDayId`, rate basis copy and locked quotes; order detail with intake card, receipt photo (presigned GET), balance block, "Pay now" opening `linkUrl`, fulfilment toggle until the cutoff; `PILOT_TIMELINE` labels; Express hidden under V1_2; terms acceptance. About 6 tasks.
- **Plan C, driver app** (`apps/rider-mobile`): manifest by batch from `GET /me/manifest`; pickup handoff (bag IDs, count, photo, fee collected); intake form with receipt upload (shared `uploadDocument` moved to `packages/api-client`); verified ready; return handoff with cash; failed attempt; earnings and float tab. About 6 tasks.
- **Plan D, admin** (`apps/admin-dashboard`): config editor gains the Pilot group (`pilotMode`, quotes, leg pay, attempt fee, cutoffs); service days page; shops pilot fields and rates editor; batches planner; intake review; payment requests and verification; floats and end-of-day reconciliation with CSV; `GET /admin/pilot/metrics` endpoint and page. About 7 tasks.

## Self-review notes
- Spec coverage: V0 (Tasks 1, 2), V1 (Task 3), V2 (Tasks 6, 7, 8, 9), V3 (Tasks 4, 5), interfaces for V4 to V6 (Tasks 10, 11); V7 and V8 live in Plan D and the ops kit.
- Names used consistently: `pilotMode`, `serviceDayId`, `rateBasisSnapshot`, `pickupQuotePhp`, `returnQuotePhp`, `recordIntake`, `verifyReady`, `complete`/`fail` on LegsService, `chooseFulfilment`, `legSplit`, `intakeBill`, `customerBalance`.
- Review Focus items are pinned: cutoff boundary (Tasks 4, 6), slot race (Task 6), double intake (Task 8), double leg (Task 9), minimum charge (Task 7).
