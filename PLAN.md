# Wash & Go — Build Plan

Status: **core platform direction revised 2026-07-17; debate session same day
resolved surfaces, sequencing, and backend-pattern parameters — all marked
PENDING CEO APPROVAL.** ADR-002 supersedes the earlier Flutter,
public-dashboard, and Google Maps choices. NestJS remains the backend pick;
mobile is two React Native/Expo apps, and TomTom is the maps provider.

Governance: three founders. Clyde authored ADR-001/002/003 and the
startup-grind docs; Ban accepted the 2026-07-17 debate decisions below; the CEO
holds final approval. Nothing in the debate outcomes is an implementation
mandate until the CEO signs off and ADR-003 is amended + accepted.

Debate outcomes (2026-07-17, Ban-accepted, CEO approval pending):

| # | Decision |
| --- | --- |
| Repo shape | `apps/{customer-mobile, rider-mobile, admin-dashboard, laundry-portal, api, landing-page}/` + `packages/{api-client, domain, ui, maps}/` + `infrastructure/` — pnpm monorepo |
| Mobile | Two separate RN/Expo apps (customer + rider), per ADR-002 as written |
| Web stack | TanStack everywhere: Start (SSR) for `landing-page`, Router SPAs for `laundry-portal` + `admin-dashboard`. Amends ADR-002's Next.js wording |
| Shop surface | `laundry-portal` ships Phase 1-2 — pay-at-weigh-in flow requires shop weight entry; supersedes ADR-002's no-shop-surface stance |
| Admin surface | `admin-dashboard` scaffolded day 1, built Phase 4+ |
| Sequencing | **Express-first build, dual-service launch** — express courier slice weeks 2-4 exercises the full money path; scheduled batch engine weeks 5-9; public launch when both live |
| ADR-003 params | Pragmatic repository rule (repos mandatory for orders/payments/credits/remittance/dispatch, whitelisted domains may inject Prisma directly); explicit tx param for cross-domain transactions; express slice = ADR acceptance gate |
| Express capacity | `Shop.expressSlotsPerDay` + booked-count check inside dispatch tx; capacity-window table deferred |
| TomTom proof gate | Owner deferred to founder sync (still blocking maps work) |
| D10 Maps provider | **OPEN — needs final founder decision.** TomTom (ADR-002) vs Google Maps. Leaning **Google** — free tier covers pilot (mobile display free, 10k/SKU/mo calls), known-good Zamboanga data, kills the unowned proof gate + MapLibre spike. Either way the vendor sits behind the MapsProvider backend boundary, so a later swap stays feasible |
| D11 Auth | **Locked:** v1 **fully utilizes Firebase Auth** — OTP, sessions, and per-request ID-token verification via the Admin SDK guard; roles/state stay in Postgres. The **NestJS-native auth stack** (own JWT mint + refresh + tokenVersion revocation) is built in parallel, feature-flagged OFF and unused in v1. Both behind one `AuthGuard` seam; dormant path CI-tested every build; switch = config flip |

---

## 0. Locked decisions

| Layer           | Pick                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| Backend         | **NestJS + Fastify adapter + TypeScript**                                                                   |
| ORM             | **Prisma** (Postgres driver, `Decimal` for money)                                                           |
| Database        | **PostgreSQL 16** (canonical, single source of truth)                                                       |
| Realtime        | **NestJS `@WebSocketGateway` + Socket.io + Redis adapter**; Postgres canonical                              |
| Public web      | **`apps/landing-page/` — TanStack Start (SSR), onboarding only** (debate D2.1/D3; amends ADR-002 Next.js wording — PENDING CEO) |
| Shop web        | **`apps/laundry-portal/` — TanStack Router SPA, ships Phase 1-2** (debate D2.3 — weigh entry gates payment flow — PENDING CEO)  |
| Admin web       | **`apps/admin-dashboard/` — TanStack Router SPA, scaffolded day 1, built Phase 4+** (debate D2.3 — PENDING CEO)                 |
| Mobile          | **React Native + Expo development builds + Expo Router + TypeScript** (separate customer + rider apps)      |
| Auth            | **Firebase Auth (OTP) → NestJS-issued JWT**                                                                 |
| Maps            | **TomTom behind backend adapters; MapLibre renderer pending device proof**                                  |
| Payments        | **PayMongo only** at launch (fronts GCash/Maya/cards/QR Ph)                                                 |
| Background jobs | **BullMQ + Redis**                                                                                          |
| Hosting         | **Deferred** — decide at deploy time (see §1.11 for candidates; leaning DigitalOcean or self-hosted for DB) |

Team acceptance: NestJS learning curve is real (~1 week to productive, 3-4 weeks to fluent). Team
accepted the ramp cost because switching frameworks mid-build is materially worse than paying
the syntax tax now. Full argument in §8.

Ambiguities still open, called out in §7:

- Cadence values (weekly / biweekly / monthly?)
- Voucher TTL (proposing 90 days)
- Pickup window semantics (customer-picked vs zone-defined)
- Rider ↔ vehicle relationship (1:1 profile vs per-run)
- Shop tie-break when multiple partner shops sit in one zone
- Service fee ₱7 per order vs per bag
- Scheduled delivery ₱40 flat vs distance-tiered inside zone
- Cash reconciliation ownership at handoff

---

## 1. Stack Decision Record

Short form per layer: **pick · alternative · why**.

### 1.1 Backend — NestJS + Fastify adapter + TypeScript

- **Alternative rejected:** Django + django-ninja.
- **Why:** WS ergonomics (single-runtime `@WebSocketGateway` with shared DI vs Django Channels'
  separate consumer classes); tighter fit with API-first + separate SPA deploy; growth into TS;
  Fastify raw HTTP throughput headroom; type-safety end-to-end from Postgres → Prisma → NestJS →
  React (via `openapi-typescript` off Swagger). Cost accepted: syntax ramp for a Django-strong
  lead (~1 week to productive). See §8 for full debate.

### 1.2 Realtime — NestJS `@WebSocketGateway` + Socket.io + Redis adapter

- **Alternative rejected:** raw `ws` adapter (leaner, no rooms).
- **Why:** Socket.io gives rooms, ack, auto-reconnect, fallback to long-poll — features we'd
  otherwise build. `@socket.io/redis-adapter` for horizontal fan-out when we scale past one node.
  Same process as HTTP routes; guards + DI shared. Postgres remains canonical; all state written
  through service methods, gateway only emits.

### 1.3 Web surfaces — TanStack everywhere, three apps (debate D2/D3, PENDING CEO)

- **Alternatives rejected:** Next.js resurrection (rework of live design system, deleted
  scaffold); mixed stacks (double conventions for a 3-dev team); operational routes on the
  public site.
- **Why:** one web framework family across all three surfaces. `apps/landing-page/` (TanStack
  Start, SSR) stays onboarding-only — discovery, coverage checking, application intake, consent,
  app-download handoff; its prototype product routes (`login`, `book-order`, `my-orders`) get
  stripped or repurposed into onboarding CTAs. `apps/laundry-portal/` (TanStack Router SPA) is
  the shop surface — weigh entry, status transitions, earnings — required early because the
  pay-at-weigh-in flow (§10.2) has no data-entry point without it. `apps/admin-dashboard/`
  (TanStack Router SPA) is scaffolded day 1, built Phase 4+. Public and private surfaces keep
  separate hosts, auth policies, analytics boundaries, and release lifecycles.

### 1.4 Mobile — React Native + Expo

- **Alternative rejected:** Flutter and a single role-switched app.
- **Why:** React Native keeps TypeScript across API contracts, web, backend, and shared packages.
  Expo development builds support the native modules required for maps, camera, notifications,
  secure storage, and background location. Separate customer and rider binaries keep permissions,
  release cadence, analytics, and store messaging clear while sharing `api-client`, `domain`, `ui`,
  and `maps` packages. Expo Go is not the production development runtime.

### 1.5 ORM — Prisma

- **Alternative rejected:** TypeORM (Nest's original default; migrations weaker), Drizzle
  (lighter, less mature migration story), MikroORM (data-mapper, steeper curve).
- **Why:** Best DX in the TS ecosystem, schema-first, `Decimal` maps to Postgres `numeric`
  (money-safe), migrations are boring and reliable, generated client is fully typed. `PrismaModule`
  wraps `PrismaClient` into a NestJS provider — standard idiom.

### 1.6 Auth — v1 fully on Firebase Auth; NestJS-native auth built dormant (D11, locked 2026-07-17)

- **v1 launch path — Firebase everything:** SMS OTP, session management, and token refresh all
  Firebase. Clients attach the Firebase ID token to every API request; a NestJS guard verifies it
  via the Admin SDK (cached JWKS, in-process). On first sign-in the backend upserts the Postgres
  `User` keyed by `firebaseUid`. Roles and all business state stay in Postgres — the guard
  resolves roles from the DB (or mirrored custom claims) after verification. No NestJS-minted JWT
  in v1.
- **Parallel NestJS-native auth (built, unused in v1):** the backend's own session stack — JWT
  mint on `POST /auth/session`, refresh rotation, `tokenVersion` instant revocation — developed
  alongside but **feature-flagged OFF.** Both paths sit behind one `AuthGuard` seam so the switch
  is a config flip. Guardrails against dormant-code rot: CI integration-tests the native path
  every build; one smoke test per release. Insurance against Firebase pricing/quota/policy
  surprises without a rebuild.
- **Trade accepted in v1:** per-request Firebase verification (fast — local JWKS signature check)
  and Firebase-owned revocation semantics, in exchange for zero session infrastructure to operate
  at launch.

### 1.7 Maps — provider OPEN (D10, needs final founder decision); MapsProvider boundary locked

- **Locked regardless of vendor:** all privileged geo calls (search, geocoding, reverse geocoding,
  routing, matrix, optimization) go through a NestJS `MapsProvider` adapter. NestJS normalizes
  results, applies service-zone validation, caches stable work, records route decisions. Clients
  never hold privileged keys. MVP navigation = deep-link to the rider's navigation app.
- **Option A — Google Maps (current lean):** known-good Zamboanga/PH data (barangay-level
  geocoding, POI coverage), mobile map display free via SDK, pilot volume fits the 10k/SKU/month
  free calls. Kills the unowned TomTom proof gate + the MapLibre device spike — unblocks Phase 0
  maps work. ToS constraints: Google data must display on Google maps; cache only lat/lng +
  place_id long-term. `react-native-maps` with Google provider.
- **Option B — TomTom (ADR-002 as written):** cheaper at scale, display-freedom (MapLibre works
  with TomTom data). Requires the 30-address/10-route Zamboanga coverage proof + MapLibre
  Android/iOS spike first — both currently unowned and blocking.
- **Decision rule:** founders pick at the next sync. If Google: record ADR amendment + a defined
  TomTom revisit trigger (e.g. sustained Google spend threshold or second-city expansion). If
  TomTom: assign the proof-gate owner immediately — it blocks Phase 0.

### 1.8 Payments — PayMongo only at launch

- **Alternative:** PayMongo + direct GCash/Maya rails.
- **Why:** PayMongo fronts GCash + Maya + cards + QR Ph in one integration, one webhook contract,
  one reconciliation file. Direct rails only justified when take-rate becomes a material margin
  drag (revisit around ~₱1M GMV/month).

### 1.9 Operations — manual pilot, then private console

- **Alternative rejected:** role-gated operational routes in the public onboarding deployment.
- **Why:** early volume should first validate the real shop/admin workflow. Documented manual
  procedures and narrow backend tooling avoid prematurely building a large dashboard. When volume,
  error rate, or reconciliation risk crosses an agreed threshold, add `apps/ops-console/` as a
  separate private deployable with strict role/ownership controls.

### 1.10 Background jobs — BullMQ + Redis

- **Alternative:** BullMQ Pro (paid features), agenda (older), Temporal (heavier, overkill).
- **Why:** De-facto Node standard, first-class NestJS integration via `@nestjs/bullmq`, retries +
  backoff + repeatable jobs (for schedule occurrence generation + remittance batch cron) all
  built in. Redis doubles as Socket.io channel layer.

### 1.11 Hosting — deferred

Not locking hosting until we're closer to deploy. Preferences noted from team feedback:

- Render dropped from consideration (poor prior experience).
- Neon dropped (perceived slow at PH-region latency).
- Leaning toward **DigitalOcean** (App Platform for API, managed Postgres, managed Redis) or
  **self-hosted Postgres** on a DO Droplet for lower latency + full control.

Candidate matrix to evaluate at deploy time:

| Component                           | Options to consider                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Nest API + BullMQ worker            | DigitalOcean App Platform · Fly.io · self-hosted VPS (Droplet, Hetzner)                                      |
| Postgres                            | DO Managed Postgres · self-hosted on DO Droplet (Docker + backups) · Supabase (if we want a DB service back) |
| Redis (BullMQ + Socket.io adapter)  | DO Managed Redis · self-hosted alongside Postgres · Upstash if we need serverless                            |
| Next.js onboarding website          | Vercel · DO App Platform · self-hosted Node on Droplet                                                       |
| Private ops console (deferred)      | Separate authenticated deployment; provider decided when scoped                                              |
| Object storage (QR proof, receipts) | Cloudflare R2 · DO Spaces · S3                                                                               |
| CDN / edge                          | Cloudflare (regardless of origin host)                                                                       |

Decision drivers when we lock:

- PH-region latency (Singapore or Sydney region matters — most managed DBs are US default)
- Cost at launch scale (self-host = ~$20/mo, managed = ~$60-150/mo)
- Ops burden (self-host = you own backups, patching, monitoring)
- Backup/PITR story (managed usually wins here)

---

## 2. Data Model — Prisma schema

Canonical Postgres. All money = `Decimal(12,2)` PHP. All timestamps `timestamptz`. Enums are
Prisma enums. Anything I'm guessing at is marked `// AMBIGUOUS`.

```prisma
// ---------- Identity ----------
enum UserRole { CUSTOMER RIDER SHOP_OWNER SHOP_STAFF ADMIN }

model User {
  id              String      @id @default(cuid())
  firebaseUid     String      @unique
  phone           String      @unique
  email           String?     @unique
  displayName     String
  roles           UserRole[]
  createdAt       DateTime    @default(now())
  disabledAt      DateTime?

  customerProfile CustomerProfile?
  riderProfile    RiderProfile?
  shopMemberships ShopMember[]
  wallet          CreditWallet?
  addresses       Address[]
  orders          Order[]     @relation("CustomerOrders")
  schedules       Schedule[]
  events          OrderEvent[]
  packPurchases   CreditPackPurchase[]
  walletTxns      WalletTransaction[]
  notifications   Notification[]
}

model CustomerProfile {
  userId           String   @id
  user             User     @relation(fields: [userId], references: [id])
  defaultAddressId String?
  defaultAddress   Address? @relation("DefaultAddress", fields: [defaultAddressId], references: [id])
}

model Address {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  label      String   // "Home", "Office"
  line1      String
  line2      String?
  barangay   String
  city       String
  lat        Decimal  @db.Decimal(9,6)
  lng        Decimal  @db.Decimal(9,6)
  zoneId     String?
  zone       Zone?    @relation(fields: [zoneId], references: [id])
  defaultFor CustomerProfile[] @relation("DefaultAddress")
  schedules  Schedule[]
  orders     Order[]
}

// ---------- Geography / capacity ----------
model Zone {
  id            String   @id @default(cuid())
  name          String   @unique
  polygon       Json     // GeoJSON polygon; upgrade to PostGIS geometry if needed
  runsPerDay    Int      @default(2)
  bagsPerRun    Int      @default(10)
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())

  vehicles      Vehicle[] @relation("PrimaryZone")
  addresses     Address[]
  schedules     Schedule[]
  runs          Run[]
  orders        Order[]
  shops         Shop[]
  capacityFlags ZoneCapacityFlag[]
}

model ZoneCapacityFlag {
  id             String    @id @default(cuid())
  zoneId         String
  zone           Zone      @relation(fields: [zoneId], references: [id])
  triggeredAt    DateTime  @default(now())
  utilizationPct Decimal   @db.Decimal(5,2)
  resolvedAt     DateTime?
  action         String?   // "SUBDIVIDE" | "ADD_VEHICLE" | "DISMISSED"
}

// ---------- Shop side ----------
model Shop {
  id             String    @id @default(cuid())
  name           String
  address        String
  lat            Decimal   @db.Decimal(9,6)
  lng            Decimal   @db.Decimal(9,6)
  zoneId         String?
  zone           Zone?     @relation(fields: [zoneId], references: [id])
  active         Boolean   @default(true)
  commissionPct  Decimal   @default(12.00) @db.Decimal(5,2) // per-shop override, default 12% — PENDING founder rate card
  expressSlotsPerDay Int   @default(0) // reserved express queue capacity (Logistics v1.1); booked count checked inside dispatch tx
  createdAt      DateTime  @default(now())

  members        ShopMember[]
  services       ShopService[]
  orders         Order[]
  remittanceLines RemittanceLine[]
  remittanceBatches RemittanceBatch[]
}

model ShopMember {
  id     String @id @default(cuid())
  shopId String
  userId String
  role   String  // "OWNER" | "STAFF"
  shop   Shop    @relation(fields: [shopId], references: [id])
  user   User    @relation(fields: [userId], references: [id])
  @@unique([shopId, userId])
}

enum BillingUnit { PER_KG PER_PIECE FLAT }

model ServiceCatalogItem {
  id          String        @id @default(cuid())
  code        String        @unique // "WDF", "WDF_IRON", "DRY_CLEAN", "WEDDING_GOWN"
  name        String
  billingUnit BillingUnit
  shopPrices  ShopService[]
  schedules   Schedule[]
}

model ShopService {
  id              String              @id @default(cuid())
  shopId          String
  serviceId       String
  ratePhp         Decimal             @db.Decimal(10,2)
  minWeightKg     Decimal?            @db.Decimal(6,2)
  turnaroundHours Int
  active          Boolean             @default(true)
  shop            Shop                @relation(fields: [shopId], references: [id])
  service         ServiceCatalogItem  @relation(fields: [serviceId], references: [id])
  orders          Order[]
  @@unique([shopId, serviceId])
}

// ---------- Fleet ----------
enum VehicleKind { PIAGGIO_APE PARTNER_MOTORCYCLE }

model Vehicle {
  id             String       @id @default(cuid())
  kind           VehicleKind
  plateNo        String       @unique
  capacityBags   Int          @default(10)
  primaryZoneId  String?
  primaryZone    Zone?        @relation("PrimaryZone", fields: [primaryZoneId], references: [id])
  active         Boolean      @default(true)
  riders         RiderProfile[]
  runs           Run[]
}

model RiderProfile {
  userId        String    @id
  user          User      @relation(fields: [userId], references: [id])
  vehicleId     String?   // AMBIGUOUS: 1:1 primary vehicle, or per-run assignment?
  vehicle       Vehicle?  @relation(fields: [vehicleId], references: [id])
  onDuty        Boolean   @default(false)
  lastKnownLat  Decimal?  @db.Decimal(9,6)
  lastKnownLng  Decimal?  @db.Decimal(9,6)
  lastPingAt    DateTime?
  runs          Run[]
}

// ---------- Scheduling ----------
enum ScheduleKind   { ONE_TIME RECURRING }
enum Cadence        { WEEKLY BIWEEKLY MONTHLY } // AMBIGUOUS: confirm with product
enum ScheduleStatus { ACTIVE PAUSED CANCELLED }

model Schedule {
  id                String              @id @default(cuid())
  customerId        String
  customer          User                @relation(fields: [customerId], references: [id])
  kind              ScheduleKind
  cadence           Cadence?            // null for ONE_TIME
  byWeekday         Int?                // 0..6 for weekly
  startDate         DateTime            @db.Date
  endDate           DateTime?           @db.Date
  pickupWindowStart String              // "08:00"  AMBIGUOUS: type + zone-defined vs customer-picked
  pickupWindowEnd   String              // "11:00"
  addressId         String
  address           Address             @relation(fields: [addressId], references: [id])
  zoneId            String
  zone              Zone                @relation(fields: [zoneId], references: [id])
  defaultServiceId  String
  defaultService    ServiceCatalogItem  @relation(fields: [defaultServiceId], references: [id])
  status            ScheduleStatus      @default(ACTIVE)
  createdAt         DateTime            @default(now())
  occurrences       ScheduleOccurrence[]
  orders            Order[]
}

// One row per generated pickup date. Materialized nightly so pause/skip/holiday
// are row-level state, not date-math at read time.
model ScheduleOccurrence {
  id         String   @id @default(cuid())
  scheduleId String
  schedule   Schedule @relation(fields: [scheduleId], references: [id])
  pickupDate DateTime @db.Date
  skipped    Boolean  @default(false)
  orderId    String?  @unique
  order      Order?   @relation(fields: [orderId], references: [id])
  @@unique([scheduleId, pickupDate])
}

// ---------- Orders ----------
enum ServiceType { SCHEDULED EXPRESS }
enum OrderStatus {
  BOOKED
  ASSIGNED_TO_RUN
  PICKED_UP
  AT_SHOP
  PROCESSING
  READY_FOR_RETURN
  OUT_FOR_RETURN
  DELIVERED
  CANCELLED
  DISPUTED
}
enum PaymentMethod { CASH GCASH MAYA CARD CREDITS }

model Order {
  id                  String        @id @default(cuid())
  code                String        @unique // "WG-2026-000123"
  customerId          String
  customer            User          @relation("CustomerOrders", fields: [customerId], references: [id])
  scheduleId          String?
  schedule            Schedule?     @relation(fields: [scheduleId], references: [id])
  serviceType         ServiceType
  status              OrderStatus   @default(BOOKED)

  pickupAddressId     String
  pickupAddress       Address       @relation(fields: [pickupAddressId], references: [id])
  zoneId              String
  zone                Zone          @relation(fields: [zoneId], references: [id])

  shopId              String?
  shop                Shop?         @relation(fields: [shopId], references: [id])
  shopServiceId       String?
  shopService         ShopService?  @relation(fields: [shopServiceId], references: [id])
  weightKg            Decimal?      @db.Decimal(6,2) // set at pickup weigh-in

  // Price breakdown, computed by pricing engine at status transitions.
  washValuePhp        Decimal       @default(0) @db.Decimal(10,2)
  deliveryFeePhp      Decimal       @default(0) @db.Decimal(10,2)
  serviceFeePhp       Decimal       @default(0) @db.Decimal(10,2)
  commissionPhp       Decimal       @default(0) @db.Decimal(10,2)
  shopRemittancePhp   Decimal       @default(0) @db.Decimal(10,2)
  discountPhp         Decimal       @default(0) @db.Decimal(10,2) // credits + voucher value
  customerTotalPhp    Decimal       @default(0) @db.Decimal(10,2)

  paymentMethod       PaymentMethod?
  paidAt              DateTime?

  scheduledPickupAt   DateTime
  pickedUpAt          DateTime?
  deliveredAt         DateTime?
  createdAt           DateTime      @default(now())

  events              OrderEvent[]
  runStops            RunStop[]
  transactions        Transaction[]
  remittanceLine      RemittanceLine?
  voucherRedemption   VoucherRedemption?
  walletTxns          WalletTransaction[]
  occurrence          ScheduleOccurrence?

  @@index([status, zoneId, scheduledPickupAt])
  @@index([customerId, createdAt(sort: Desc)])
}

model OrderEvent {
  id          String      @id @default(cuid())
  orderId     String
  order       Order       @relation(fields: [orderId], references: [id])
  status      OrderStatus
  actorUserId String?
  actor       User?       @relation(fields: [actorUserId], references: [id])
  meta        Json?
  createdAt   DateTime    @default(now())
}

// ---------- Runs / routing ----------
enum RunStatus { PLANNED DISPATCHED IN_PROGRESS COMPLETED CANCELLED }

model Run {
  id           String       @id @default(cuid())
  zoneId       String
  zone         Zone         @relation(fields: [zoneId], references: [id])
  vehicleId    String
  vehicle      Vehicle      @relation(fields: [vehicleId], references: [id])
  riderId      String
  rider        RiderProfile @relation(fields: [riderId], references: [userId])
  runDate      DateTime     @db.Date
  slot         String       // "AM" | "PM"  AMBIGUOUS: slot naming
  status       RunStatus    @default(PLANNED)
  startedAt    DateTime?
  completedAt  DateTime?
  stops        RunStop[]
  @@unique([zoneId, runDate, slot])
}

model RunStop {
  id          String    @id @default(cuid())
  runId       String
  run         Run       @relation(fields: [runId], references: [id])
  orderId     String
  order       Order     @relation(fields: [orderId], references: [id])
  sequence    Int
  arrivedAt   DateTime?
  completedAt DateTime?
  qrToken     String    @unique // signed short-lived JWT (5 min)
  @@unique([runId, sequence])
}

// ---------- Payments + ledger ----------
enum TxnKind   { PAYMENT_IN REFUND_OUT REMITTANCE_OUT ADJUSTMENT }
enum TxnStatus { PENDING SUCCEEDED FAILED REVERSED }

model Transaction {
  id                String        @id @default(cuid())
  orderId           String?
  order             Order?        @relation(fields: [orderId], references: [id])
  kind              TxnKind
  method            PaymentMethod
  amountPhp         Decimal       @db.Decimal(10,2)
  provider          String?       // "paymongo" | "cash"
  providerReference String?       // PayMongo payment_intent id
  status            TxnStatus     @default(PENDING)
  createdAt         DateTime      @default(now())
  settledAt         DateTime?
  packPurchase      CreditPackPurchase?

  @@unique([provider, providerReference], name: "unique_provider_ref")
  @@index([providerReference])
}

// One line per delivered order. Idempotent unique(orderId).
model RemittanceLine {
  id             String   @id @default(cuid())
  orderId        String   @unique
  order          Order    @relation(fields: [orderId], references: [id])
  shopId         String
  shop           Shop     @relation(fields: [shopId], references: [id])
  washValuePhp   Decimal  @db.Decimal(10,2)
  commissionPhp  Decimal  @db.Decimal(10,2)
  payoutPhp      Decimal  @db.Decimal(10,2) // wash - commission
  batchId        String?
  batch          RemittanceBatch? @relation(fields: [batchId], references: [id])
  createdAt      DateTime @default(now())
}

model RemittanceBatch {
  id          String   @id @default(cuid())
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id])
  periodStart DateTime @db.Date
  periodEnd   DateTime @db.Date
  totalPhp    Decimal  @db.Decimal(12,2)
  paidAt      DateTime?
  reference   String?  // bank/eWallet ref
  createdAt   DateTime @default(now())
  lines       RemittanceLine[]
}

// ---------- Credits wallet ----------
model CreditWallet {
  userId       String              @id
  user         User                @relation(fields: [userId], references: [id])
  balancePhp   Decimal             @default(0) @db.Decimal(10,2)
  updatedAt    DateTime            @updatedAt
  transactions WalletTransaction[]
  vouchers     Voucher[]
}

enum WalletTxnKind { PURCHASE BONUS REDEMPTION REFUND ADJUSTMENT EXPIRY }

model WalletTransaction {
  id             String              @id @default(cuid())
  walletUserId   String
  wallet         CreditWallet        @relation(fields: [walletUserId], references: [userId])
  userId         String
  user           User                @relation(fields: [userId], references: [id])
  kind           WalletTxnKind
  amountPhp      Decimal             @db.Decimal(10,2) // signed: + credit, - debit
  orderId        String?
  order          Order?              @relation(fields: [orderId], references: [id])
  packPurchaseId String?
  packPurchase   CreditPackPurchase? @relation(fields: [packPurchaseId], references: [id])
  meta           Json?
  createdAt      DateTime            @default(now())
}

model CreditPack {
  id           String               @id @default(cuid())
  code         String               @unique // "PACK_250", "PACK_500"
  pricePhp     Decimal              @db.Decimal(10,2)
  creditsPhp   Decimal              @db.Decimal(10,2) // face value incl. bonus
  bonusPct     Decimal              @db.Decimal(5,2)
  voucherCount Int                  @default(0)
  active       Boolean              @default(true)
  purchases    CreditPackPurchase[]
}

model CreditPackPurchase {
  id             String              @id @default(cuid())
  userId         String
  user           User                @relation(fields: [userId], references: [id])
  packId         String
  pack           CreditPack          @relation(fields: [packId], references: [id])
  transactionId  String              @unique
  transaction    Transaction         @relation(fields: [transactionId], references: [id])
  createdAt      DateTime            @default(now())
  walletTxns     WalletTransaction[]
  vouchersIssued Voucher[]
}

enum VoucherKind   { SCHEDULED_DELIVERY_FREE }
enum VoucherStatus { ISSUED REDEEMED EXPIRED REVOKED }

model Voucher {
  id           String              @id @default(cuid())
  code         String              @unique
  walletUserId String
  wallet       CreditWallet        @relation(fields: [walletUserId], references: [userId])
  issuedFromId String?
  issuedFrom   CreditPackPurchase? @relation(fields: [issuedFromId], references: [id])
  kind         VoucherKind
  status       VoucherStatus       @default(ISSUED)
  issuedAt     DateTime            @default(now())
  expiresAt    DateTime?           // AMBIGUOUS: propose 90d
  redemption   VoucherRedemption?
}

model VoucherRedemption {
  id         String   @id @default(cuid())
  voucherId  String   @unique
  voucher    Voucher  @relation(fields: [voucherId], references: [id])
  orderId    String   @unique
  order      Order    @relation(fields: [orderId], references: [id])
  amountPhp  Decimal  @db.Decimal(10,2)
  redeemedAt DateTime @default(now())
}

// ---------- Notifications ----------
model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  channel   String   // "PUSH" | "SMS" | "EMAIL"
  template  String
  payload   Json
  sentAt    DateTime?
  createdAt DateTime @default(now())
}
```

---

## 3. Backend Module Map — NestJS (proposal)

**Status: Proposed.** This section is a working implementation sketch, not an
accepted mandate. ADR-003 owns the proposed modular-monolith, repository, API,
and optional Nginx decisions. Validate one vertical slice before accepting it.

The proposed shape uses one Nest module per meaningful business domain. Each
module may contain `domain/`, `dto/`, `repositories/`, `services/`, and
`controllers/`. Controllers and workers call services; services call
repositories; only repositories access Prisma for domain persistence. Modules
export public services or facades, not repositories. Do not create a module per
table or move business rules into `common/`.

```
backend/src/
  main.ts                       // bootstrap: Fastify, CORS, global pipes, WS adapter
  app.module.ts
  common/                       // decorators, filters, pipes, money helpers, event bus
  prisma/                       // PrismaService, PrismaModule (global)
  events/                       // domain event bus (in-process EventEmitter2 → WS + BullMQ)
  jobs/                         // BullMQ processors
    schedule-occurrence.processor.ts
    remittance-batch.processor.ts
    notification.processor.ts
    webhook-retry.processor.ts
  modules/
    auth/                       // Firebase Admin verify, JWT mint, guards, role decorator
      auth.module.ts
      auth.service.ts
      auth.controller.ts        // POST /auth/session, /auth/refresh, /auth/logout
      jwt-auth.guard.ts
      roles.guard.ts
      firebase.service.ts
    users/                      // profile CRUD, address book
    zones/                      // zone CRUD, capacity flags, geo lookup
    shops/                      // Shop + ShopMember + ServiceCatalogItem + ShopService
    fleet/                      // Vehicle + RiderProfile + location upload
    scheduling/                 // Schedule CRUD + ScheduleOccurrence generator (BullMQ repeatable)
    orders/                     // Order lifecycle state machine (xstate or hand-rolled)
    dispatch/                   // Scheduled batching + Express fanout
    routing/                    // ordered-stop optimizer (MVP: nearest-neighbor)
    pricing/                    // pure engine, no I/O (§3.1)
    remittance/                 // ledger + weekly batch (§3.2)
    payments/                   // PayMongo client + webhook receiver + Transaction lifecycle
    credits/                    // wallet, packs, vouchers, redemption
    qr/                         // one-time signed JWT mint + verify
    notifications/              // FCM + SMS senders (BullMQ-backed)
    realtime/                   // WebSocketGateway(s), room mapping, guard-integrated
    admin/                      // ops endpoints for the /admin/* SPA routes
```

### 3.1 Pricing engine — exact contract

Pure function in `pricing/pricing.service.ts`, no I/O, deterministic. Called at three points:
quote (booking), weigh-in (pickup), settlement (delivery / dispute resolution).

```ts
// pricing/pricing.types.ts
import { Decimal } from "@prisma/client/runtime/library";

export type PricingInput = {
  serviceType: "SCHEDULED" | "EXPRESS";
  weightKg: Decimal; // final weighed kg
  shopService: {
    ratePhp: Decimal;
    billingUnit: "PER_KG" | "PER_PIECE" | "FLAT";
    quantity: Decimal; // pieces or 1 for FLAT
  };
  shopCommissionPct: Decimal; // e.g. new Decimal('12.00')
  deliveryFeePhp: Decimal; // Scheduled: 40; Express: resolved 65-80
  serviceFeePhp: Decimal; // 7 by default
  discounts: {
    creditsAppliedPhp: Decimal; // capped by wallet balance
    voucherKind?: "SCHEDULED_DELIVERY_FREE";
  };
};

export type LineItem = { label: string; amountPhp: Decimal };

export type PricingOutput = {
  washValuePhp: Decimal;
  commissionPhp: Decimal;
  shopRemittancePhp: Decimal;
  deliveryFeePhp: Decimal; // zeroed if voucher applied and eligible
  serviceFeePhp: Decimal;
  discountPhp: Decimal; // credits + voucher value
  customerTotalPhp: Decimal; // wash + delivery + service - discount, floored at 0
  platformGrossPhp: Decimal; // commission + delivery + service (pre processing cost)
  breakdown: LineItem[];
};

// pricing/pricing.service.ts
@Injectable()
export class PricingService {
  priceOrder(input: PricingInput): PricingOutput {
    /* ... */
  }
}
```

Rules:

- All Decimal, no floats. Round to 2 dp at each line item, not only at the end.
- Voucher `SCHEDULED_DELIVERY_FREE` zeros `deliveryFeePhp`, only for Scheduled service. Enforce eligibility
  at redemption time; engine trusts input.
- Credits reduce `customerTotalPhp` after other line items; capped so total ≥ 0.
- Payment processing cost (~4.5%) is NOT part of customer total — booked later as an ADJUSTMENT
  `Transaction` when settlement lands.
- Unit tests: golden-file per representative order from spec §6 + property-based tests
  (`fast-check`) across `credits × voucher × weight × commission%` combinations.

### 3.2 Remittance ledger — exact contract

Two idempotent transactional operations in `RemittanceService`.

**`recordFor(orderId)`** — called on `OrderStatus = DELIVERED`:

```
Input:  orderId
Read:   Order (must be DELIVERED, must have shopId, washValuePhp, commissionPhp)
Write:  RemittanceLine {
          orderId, shopId,
          washValuePhp = order.washValuePhp,
          commissionPhp = order.commissionPhp,
          payoutPhp = washValuePhp - commissionPhp,
          batchId = null
        }
Constraint: @unique(orderId) — DB-level dedup, safe against replays
Emit:   RemittanceRecorded { orderId, shopId, payoutPhp } → realtime + notification
```

**`closeBatch({ shopId, periodStart, periodEnd })`** — weekly BullMQ repeatable job:

```
Input:  shopId, periodStart (inclusive), periodEnd (exclusive)
Read:   RemittanceLine where batchId IS NULL AND shopId matches AND
        createdAt in [periodStart, periodEnd)
Write:  RemittanceBatch {
          shopId, periodStart, periodEnd,
          totalPhp = SUM(payoutPhp)
        }
Update: lines.batchId = batch.id (same Prisma $transaction)
Emit:   RemittanceBatchClosed { batchId, shopId, totalPhp } → notify shop
```

Shop payouts (bank/eWallet transfer) are **external** at launch. Batch tracks intent; an ops user
marks paid from the admin UI with the transfer reference, which sets `paidAt` + `reference`. No
automated bank transfer at launch — KYB overhead too high.

### 3.3 Dispatch — Scheduled batch, Express service

**Scheduled (Piaggio batch):**

- BullMQ repeatable at T-60min per pickup window: ensure a `Run` exists for
  `(zoneId, runDate, slot)`.
- `dispatch.assignOrderToRun(order)`:
  - pick earliest `Run` in `order.zone` with `stops.count < vehicle.capacityBags`
  - append `RunStop(sequence = next)`, mint `qrToken`
  - transition `Order.status = ASSIGNED_TO_RUN`
- No capacity → emit `ZoneCapacityBreached` → create `ZoneCapacityFlag`; order queues for next slot.

**Express (partner motorcycle):**

- `dispatch.dispatchExpress(order)`:
  - fan push to on-duty `RiderProfile` with `vehicle.kind == PARTNER_MOTORCYCLE` within N km via
    TomTom routing or matrix distance (cached per zone edge)
  - first-accept wins; 60s timeout; re-fan up to 3 times
- No `Run` for Express; single-stop record sits on the order.

### 3.4 QR verification

- One token per handoff. Up to 4 per order lifecycle: pickup-from-customer, drop-at-shop,
  pickup-from-shop, deliver-to-customer.
- Token = short-lived signed JWT (5 min TTL) signed with a server-side secret. Rider app scans
  it, calls `POST /orders/:id/handoff` with `{ token, stage, actorGeo? }`. Server verifies
  signature + expected stage + not-yet-consumed.
- Consumption recorded on `RunStop` (pickup/delivery legs) and on `Order.events` (shop legs).

### 3.5 Realtime — Socket.io gateway

```ts
// realtime/orders.gateway.ts
@WebSocketGateway({ namespace: "/rt", cors: true })
@UseGuards(WsJwtGuard)
export class OrdersGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage("order:subscribe")
  subscribeToOrder(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: Socket,
  ) {
    // authorization already applied by WsJwtGuard; scope by user or ADMIN role
    client.join(`order:${orderId}`);
  }
}
```

Domain events (`OrderStatusChanged`, `RunLocationUpdated`, `NewOrderInZone`, etc.) are emitted
onto NestJS `EventEmitter2` from the service layer; a small subscriber fans them to the
appropriate Socket.io rooms. Redis adapter (`@socket.io/redis-adapter`) enables horizontal
scale-out without sticky sessions on the LB.

---

## 4. API Surface (REST contract sketch)

**Status: Proposed transport shape.** The operations below describe the needed
business capabilities. ADR-003 proposes REST/OpenAPI for MVP clients; GraphQL
remains an alternative and has not been adopted.

All endpoints authenticated except `/auth/*`. Bearer JWT from `POST /auth/session`. All money
returned as strings ("125.00"), never floats. All timestamps ISO-8601 UTC. `WS` = Socket.io event
via the `/rt` namespace.

### 4.1 Auth (shared)

- `POST /auth/session` — exchange Firebase ID token for backend JWT
- `POST /auth/refresh`
- `POST /auth/logout`

### 4.2 Customer app

- `GET  /me`
- `GET|POST|PATCH /me/addresses[/:id]`
- `GET  /zones/resolve?lat=&lng=`
- `GET  /shops/services?zoneId=`
- `POST /schedules` · `GET /schedules` · `PATCH /schedules/:id` (pause/skip/cancel)
- `GET  /schedules/:id/occurrences?from=&to=`
- `POST /orders` — one-shot order (Express or Scheduled)
- `GET  /orders?status=` · `GET /orders/:id` · `POST /orders/:id/cancel`
- `GET  /wallet` · `GET /wallet/transactions`
- `GET  /credit-packs` · `POST /credit-packs/:id/purchase`
- `GET  /vouchers`
- `POST /payments/intent` — returns PayMongo client_key
- `POST /payments/webhook` — PayMongo receiver (public, HMAC-verified)
- WS: `order:subscribe { orderId }`, `run:location-subscribe { runId }`

### 4.3 Rider app

- `GET  /me/run/today` — assigned run + ordered stops
- `POST /me/duty` `{ onDuty: bool }`
- `POST /me/location` — periodic ping (also emitted via WS on the reverse channel)
- `POST /runs/:id/start` · `POST /runs/:id/complete`
- `POST /runs/:id/stops/:stopId/arrive`
- `POST /orders/:id/handoff` — QR-verified transition
- `GET  /me/earnings?from=&to=`
- `POST /me/express/accept` — express dispatch response
- WS: `dispatch:offers`, `run:updates`

### 4.4 Laundry-portal API (shop-facing web app, ships Phase 1-2 per debate D2.3)

- `GET  /shop/orders?status=`
- `POST /shop/orders/:id/weigh` — set `weightKg` + `shopService` (triggers pricing recompute)
- `POST /shop/orders/:id/status` — AT_SHOP → PROCESSING → READY_FOR_RETURN
- `GET|POST|PATCH /shop/services`
- `GET  /shop/remittance/lines?status=unpaid|paid`
- `GET  /shop/remittance/batches`
- `GET  /shop/members` · `POST /shop/members/invite`
- WS: `shop:orders-inbound`

### 4.5 Private admin API (not exposed by the public onboarding website)

- `GET|POST|PATCH /admin/zones` (polygon editor)
- `GET  /admin/zones/:id/capacity` — utilization time series, active flags
- `POST /admin/zones/:id/flags/:flagId/resolve`
- `GET|POST|PATCH /admin/vehicles` · `/admin/riders`
- `GET|POST|PATCH /admin/shops` — onboarding, commission override
- `GET  /admin/orders/disputed`
- `POST /admin/remittance/batches/:id/mark-paid`
- `GET|POST|PATCH /admin/credit-packs`
- `GET  /admin/metrics/*`

Auto-generated OpenAPI at `/api-docs` (Swagger UI) + machine-readable schema at
`/api-docs-json`; consumed by the React SPA via `openapi-typescript` in CI to produce typed
client bindings.

---

## 5. Risks + Effort

Ranked by "what could quietly cost us four weeks."

### 5.1 High-risk / high-ambiguity

1. **Pricing + remittance correctness.** Money bugs erode shop trust fast. Mitigation: pure
   `priceOrder()` + golden-file tests per spec §6 order + property-based (`fast-check`) tests for
   `credits × voucher × weight × commission%`. Weekly reconciliation report from day one.
2. **Recurring-schedule semantics.** Spec is thin (open Q7). Pause / skip / holiday / DST /
   address change / cadence change are all real. Occurrence-materialization model above handles
   most at row level; the _rules_ need product input.
3. **Socket.io scale-out.** Single-node is fine at launch. When we go multi-node we must have
   `@socket.io/redis-adapter` configured or messages drop between nodes. Design in from day one;
   run one node.
4. **QR handoff under bad signal.** Rider apps in Zamboanga will lose signal. Short-lived signed
   JWTs verify offline; server dedup on consumption. Sync-when-online flow is a solid week.
5. **PayMongo webhook idempotency.** Webhooks retry. Dedup by `@@unique([provider,
providerReference])` (already in schema). Ledger-style writes only; never mutate `Transaction`.
6. **Zone capacity flagging.** Real analytics + polygon-editor feature. Ship dumb version at
   launch (>80% util → flag), improve later.
7. **Cash payment mix.** Target ≥80% digital = 20% cash. Cash reconciliation between rider
   handoff and remittance is a manual ops flow with its own dispute surface.
8. **NestJS learning curve.** Lead is Django-strong. First 1-2 weeks of Nest code will be slower
   and probably worse than Nest idioms warrant. Pair on early PRs; use `nest g` scaffolder to
   keep conventions consistent; adopt one linting/formatting config early (biome or
   eslint+prettier).

### 5.2 Route optimization — scope

**Recommendation: ordered stop list at launch. No VRP solver.**

- Scheduled runs = one vehicle per zone, ≤10 stops, geographically compact by definition.
  Nearest-neighbor from the shop or manual reorder in the rider app captures ~90% of a proper
  VRP's value.
- Real VRP (OR-Tools or Vroom) is 2–4 weeks tuning + tests + visualization at this scale, and
  needs live traffic + time windows + capacity constraints to justify itself. We don't have that
  data yet.
- Effort delta: **~1 day (heuristic)** vs. **~3 weeks (OR-Tools integration + tuning)**. Revisit
  when we have 3+ vehicles per zone or multi-zone shared runs.

### 5.3 One-line spec entries that are multi-week builds

- **"Real-time order tracking"** — Socket.io + rider battery-aware location upload + reconnect +
  backpressure. Two weeks, not two days.
- **"Zone subdivision evaluation"** — polygon editor + utilization time-series + suggestion UI.
  Two weeks unless we ship the dumb version.
- **"Route optimization"** — see §5.2.
- **"Credits + vouchers + pricing engine integration"** — accounting easy, redemption _ordering_
  (credits before voucher, voucher only for delivery, credits capped at balance, refunds reverse
  the ledger) is where bugs live. One dedicated week.
- **"Recurring schedule with pause/skip/holiday"** — occurrence generator + calendar semantics.
  One week easily two.
- **"Digital payment ≥80%"** — implies a cash-reconciliation subsystem for the 20%. Half a week
  of endpoints + ops flow.
- **"Admin dashboard"** — role-gated React admin UI. ~3-5 weeks total across phases 5 and 7.

---

## 6. Phased Build Plan

Goal (revised 2026-07-17 debate, D4): **express-first build, dual-service launch.** The express
courier flow is the thin slice that exercises the entire money path (booking → dispatch → weigh →
pay → return → remit) without the scheduled engine's batching machinery. Scheduled lands second on
proven plumbing. Public launch when both services work. PENDING CEO APPROVAL.

### Phase 0 — Platform proof and foundation (Weeks 1–2)

- Monorepo scaffold per debate: `apps/{customer-mobile, rider-mobile, admin-dashboard,
  laundry-portal, api, landing-page}/` + `packages/{api-client, domain, ui, maps}/` +
  `infrastructure/`. pnpm workspaces. `admin-dashboard/` is a placeholder folder only (built
  Phase 4+).
- Expo development builds on a real Android and iOS device. Do not make Expo Go the runtime gate.
- CI: lint, type-check, Prisma migration check, Jest, landing-page smoke, and mobile unit/smoke tests.
- Hosting: **deferred** (see §1.11). Local dev + CI use Dockerized Postgres + Redis
  (`infrastructure/`); pick production host at end of Phase 1 with real latency data.
- NestJS project (`apps/api/`): `main.ts` with Fastify adapter, global ValidationPipe, Swagger,
  WsIoAdapter.
- Prisma init with the schema in §2 (all models incl. `Shop.expressSlotsPerDay`, no logic yet);
  first migration to local Docker Postgres.
- Firebase Admin SDK wired; `POST /auth/session` verifies Firebase token, mints Nest JWT.
- JwtAuthGuard + RolesGuard + `@Roles(...)` decorator; smoke-tested with a `GET /me`.
- TomTom spike: at least 30 representative Zamboanga addresses, 10 routes, coverage-polygon
  validation, and a MapLibre/TomTom render with correct attribution on Android and iOS.
  **Blocked on gate owner (D8 — founder sync).**
- Empty deploy of the API and landing-page; installable internal builds of both Expo apps.

### Phase 1 — Express-LITE vertical slice (Weeks 2–4) — ADR-003 acceptance gate

Descoped per outside-voice re-cost (debate D9): **manual dispatch, no auto fan-out, no QR, no
realtime, no PayMongo in this slice.** Those stay in Phases 2-3 where they were already priced.

- Week-1 prerequisites (named, not smuggled): one coverage polygon + point-in-polygon check
  (minimal zone, not the batching engine); **rider pay model decided at founder sync** —
  blocking, riders can't be recruited without it.
- Data: seed one coverage area, two shops (with `expressSlotsPerDay`), two partner riders,
  three services (`prisma db seed`).
- Customer app: OTP sign-in, express booking (address → coverage check → service pick →
  weight estimate → book).
- Backend (`apps/api/`), built against the ADR-003 pattern (controller → service → repository,
  explicit tx param): `POST /orders` (Express), capacity check inside the dispatch transaction
  (advisory lock; Asia/Manila day boundary — see §13 findings), **manual rider assignment**
  (ops action, no offer state machine), pricing engine v1, OrderEvent log.
- Laundry-portal v0 (TanStack SPA): shop login, order queue, **weigh entry** (triggers price
  recompute), status transitions AT_SHOP → PROCESSING → READY_FOR_RETURN, and the **assign-rider
  button** (manual dispatch surface).
- Rider app: assigned express job (both legs: pickup→shop, shop→customer as separate
  assignments), route context, external-navigation deep link, pickup/deliver transitions.
- Cash payment recorded manually this phase. `RemittanceLine` written on DELIVERED.
- **Demo criterion:** a real express order flows phone → manually-assigned rider → shop (weighed
  in the portal) → back to the customer; ledger inspectable. **Then: review module boundaries +
  tx handling against ADR-003, amend + flip it Proposed → Accepted (with CEO sign-off).**

### Phase 2 — Payments + realtime + QR (Weeks 5–7)

- PayMongo integration (GCash + Maya + card + QR Ph) + webhook idempotency + Transaction ledger;
  pay-at-weigh-in flow live (§10.2) — portal weigh entry triggers PaymentIntent.
- Socket.io gateway: `order:subscribe`, `shop:orders-inbound`, `run:location-subscribe`.
- QR mint + `POST /orders/:id/handoff` at all four handoff points.
- Push notifications (FCM) for status changes (BullMQ-backed).
- Rider location pings + realtime location broadcast to the subscribing customer.

### Phase 3 — Scheduled service engine (Weeks 5–9, overlaps Phase 2)

- Zones + polygons + capacity ceilings; zone resolution on booking.
- Run batching: `dispatch.assignOrderToRun`, auto-create Run per (zone, date, slot, vehicle),
  stop sequencing (nearest-neighbor), Piaggio fleet records.
- Recurring schedules: Schedule CRUD in customer app, nightly BullMQ occurrence
  materialization, pause / skip / cancel, T-12h reminder notification.
- Rider app: today's Run with ordered stop list.
- **Dual-service launch gate at end of this phase:** both express + scheduled demoable.

### Phase 4 — Shop config + remittance batching + admin-dashboard start (Weeks 10–11)

- Laundry-portal: `ShopService` price editor, earnings view (paid / unpaid / current-period).
- Weekly `RemittanceBatch` BullMQ repeatable.
- `apps/admin-dashboard/` first build: "mark batch paid" action + transfer reference input,
  order exception views.

### Phase 5 — Zones tooling + admin build-out (Weeks 12–14)

- Admin-dashboard: zone polygon editor (renderer per accepted TomTom display approach),
  capacity flag list + resolution actions, rider + vehicle onboarding forms,
  dumb utilization flag (>80% triggers).

### Phase 6 — Credits + vouchers (Weeks 15–16)

- Credit packs list + purchase flow (PayMongo). **Blocked on credits legal review (§10.14).**
- Wallet ledger + balance view.
- Voucher issuance on pack purchase.
- Pricing-engine integration: credits → `discountPhp`, voucher → `deliveryFeePhp = 0` for
  Scheduled.
- Reconciliation report: issued value vs. redeemed value (admin-dashboard tile).

### Phase 7 — Optimizations (Weeks 17+)

- Route optimization: revisit when data justifies (§5.2).
- Zone subdivision suggestion tooling.
- Cash-mix reconciliation dashboard.
- TimescaleDB extension for `RiderLocationPing` history if retention becomes an issue.
- Capacity-window table upgrade (from `expressSlotsPerDay` columns) when scheduled volume
  justifies per-window modeling.

---

## 7. Open items still needing product input

- Cadence enum values + holiday handling.
- Voucher TTL — proposed 90d; needs sign-off.
- Pickup window semantics (customer-picked vs zone-defined).
- Rider ↔ vehicle relationship (fixed vs. per-run assignment).
- Shop tie-break when multiple partner shops sit in one zone.
- Service fee (₱7): per order or per bag?
- Scheduled delivery fee: flat ₱40 regardless of distance within zone, or distance-tiered?
- Shop payout automation — deferred; manual mark-paid at launch confirmed?

---

## 8. Why NestJS won this debate (record)

The team debated Django + django-ninja against NestJS + Fastify at length. Django's advantages
(team fit, free admin, batteries) were real; NestJS won on these counter-weights:

1. **Custom admin UI is happening either way.** The team plans to build a proper React admin
   surface for ops. Django admin's "free surface #4" benefit shrinks from a 4-6 week win to a
   1-2 week win (super-admin fallback only). Not enough to swing the pick alone.

2. **Realtime ergonomics.** `@WebSocketGateway` sits in the same Nest module as the HTTP routes,
   shares DI, uses the same guards, ships as one artifact. Django Channels works but is a
   separate consumer class model with its own ASGI runtime concerns. For a product where
   real-time order status + rider location is a core UX, integrated WS matters.

3. **Deploy topology is equal.** API-first, mobile calls with `Authorization: Bearer`, SPA hits
   JSON API — identical in both frameworks. This was tested as a Nest advantage and rejected:
   Nest deploy is ~2 processes (api, worker) vs Django's ~3 (api, celery worker, celery beat).
   Marginal, not decisive.

4. **Type-safety end to end.** Prisma → NestJS → Swagger → `openapi-typescript` → React SPA
   yields fully typed contracts from Postgres schema to browser. Django + django-ninja closes
   the gap (openapi-typescript works there too), but Nest's TS-native model is one fewer language
   boundary.

5. **Growth cost accepted.** Lead is Django-strong. NestJS ramp is real (~1 week to productive,
   3-4 weeks to fluent). Team decision: switching frameworks mid-build is materially worse than
   paying syntax tax up front. Learn the framework once; ship for years.

6. **Raw speed is a non-factor** at launch scale (tens to low-hundreds of orders/day) but
   NestJS + Fastify has 5-10× throughput headroom for future expansion without re-platforming.

**What we accept in return:**

- 4-6 weeks of custom admin UI work in React that Django admin would have given for free.
- 1-2 week ramp cost for the Django-strong lead learning NestJS conventions (decorators, modules,
  DI, DTOs).
- More careful attention to Prisma-with-money patterns vs Django's `DecimalField` reflexes.

Trade taken. Locked.

---

## 9. CEO Review Additions (2026-07-01)

Six items accepted from `/plan-ceo-review` SELECTIVE EXPANSION pass. Full record in
`~/.gstack/projects/Banyel3-wash-and-go/ceo-plans/2026-07-01-wash-and-go-mvp.md`.

### 9.1 Rate limiting (Phase 0)

- **Package:** `@nestjs/throttler` with Redis storage adapter (shared with BullMQ + Socket.io)
- **Applied to:**
  - `/auth/session` — 5 req/min per IP, 20 req/hour per phone
  - `/auth/refresh` — 20 req/hour per user
  - `/payments/intent` — 10 req/min per user
  - `/payments/webhook` — 100 req/min per IP (PayMongo IPs allowlisted)
  - `POST /orders` — 20 req/hour per user
  - `POST /me/express/accept` — 60 req/min per rider (bursty dispatch)
- **Global default:** 60 req/min per user on all authenticated routes
- **429 response:** JSON `{error, retryAfter}`, `Retry-After` header

### 9.2 Observability (Phase 0)

- **Logging:** `nestjs-pino` with request-id middleware. JSON structured logs. Every service method logs entry + exit + error with `{ orderId, userId, tier, amount, ... }` structured fields.
- **Metrics:** `@willsoto/nestjs-prometheus`. Baseline metrics per module:
  - HTTP: `http_requests_total{route,method,status}`, `http_request_duration_seconds`
  - Orders: `orders_created_total{tier}`, `orders_completed_total{tier}`, `order_lifecycle_duration_seconds{tier}`
  - Money: `wallet_balance_php`, `credits_issued_total`, `credits_redeemed_total`, `remittance_batch_total_php{shopId}`, `payment_processing_failures_total{provider,reason}`
  - Realtime: `ws_connections_active{namespace}`, `ws_messages_sent_total{event}`
  - Jobs: `bullmq_jobs_completed_total{queue}`, `bullmq_jobs_failed_total{queue}`
- **Alerts (day-1 required):**
  - `credits_issued_total - credits_redeemed_total` diverging > 10% week-over-week
  - `remittance_batch_total_php` = 0 for a shop that had orders that week
  - `payment_processing_failures_total` > 5/min sustained
  - `bullmq_jobs_failed_total` > 10/min
  - WS disconnects/min > baseline × 3
- **Dashboards:** one per module (Orders, Money, Realtime, Jobs, Zones). Grafana or hosted equivalent — deferred with hosting.
- **Runbooks:** written per alert before Phase 5.

### 9.3 Idempotency keys on POST endpoints

- **Contract:** all mutating POST endpoints require `Idempotency-Key: <uuid>` header from client
- **Server:** Redis SET NX with 24h TTL keyed on `idempotency:{userId}:{key}`. On hit, return cached response. On miss, execute + cache response.
- **Applied to:**
  - `POST /orders`
  - `POST /payments/intent`
  - `POST /credit-packs/:id/purchase`
  - `POST /shop/orders/:id/weigh`
  - `POST /orders/:id/handoff`
  - `POST /shop/orders/:id/status`
  - `POST /me/express/accept`
- **Applied not-required:** `/auth/session` (Firebase token itself is single-use), webhook receivers (dedup via `providerReference` unique constraint)
- **Middleware:** custom `@Idempotent()` decorator + interceptor in `common/`

### 9.4 xstate for OrderStatus

- **Package:** `xstate` v5 (no server orchestration; used as pure state guard)
- **Machine:** one machine per `Order`, materialized from `OrderStatus` on load
- **Transitions allowed:**
  ```
  BOOKED           → ASSIGNED_TO_RUN | CANCELLED
  ASSIGNED_TO_RUN  → PICKED_UP | CANCELLED
  PICKED_UP        → AT_SHOP | DISPUTED
  AT_SHOP          → PROCESSING | DISPUTED
  PROCESSING       → READY_FOR_RETURN | DISPUTED
  READY_FOR_RETURN → OUT_FOR_RETURN | DISPUTED
  OUT_FOR_RETURN   → DELIVERED | DISPUTED
  DELIVERED        → DISPUTED       (dispute window only)
  DISPUTED         → DELIVERED | CANCELLED
  CANCELLED        → (terminal)
  ```
- **Guard:** `OrdersService.transition(orderId, event)` — invalid transition = `IllegalStateTransition` exception, returns 409 to caller
- **Effect:** state changes emit `OrderStatusChanged` event + write `OrderEvent` row atomically

### 9.5 Rider location batching (Phase 2)

- **Client (React Native):** durable ordered buffer of 5 pings. When full or 75s elapsed (whichever first), POST `/me/location/batch` with an idempotency key. On network fail, retry with exponential backoff, buffer up to 50 pings before dropping oldest.
- **Server:** single Prisma `createMany` insert. Emit only the LATEST ping through WS (customer doesn't need every point, only fresh position).
- **DB:** append-only `RiderLocationPing { riderId, lat, lng, capturedAt, receivedAt }`. Simple `id, riderId, capturedAt` compound index. Migrate to TimescaleDB hypertable in Phase 8 if retention becomes an issue.

### 9.6 B2B/corporate trajectory (doc-only)

Extending §5 phased plan:

- **Phase 9+ (post-MVP):** Corporate accounts — offices, dorms, condo buildings.
  - Multi-tenant billing (one payer, many pickup addresses under one account)
  - Volume-based commission tier for the corporate customer
  - Dedicated pickup windows (before/after shifts, weekly)
  - Invoice + net-30 payment (not consumer PayMongo flow)
- **Schema hint for present-day:** the `Address.user` relation is 1:many, so multiple addresses per user already works. Corporate account = a `User` with a `corporate_profile` we add later + a policy that shifts billing method. Nothing to refactor.

### 9.7 Cross-cutting risks re-ranked after cherry-picks (updated in §10)

Updating §5.1 with the accepted mitigations:

| Risk                                      | Old rank | Now                                                             |
| ----------------------------------------- | -------- | --------------------------------------------------------------- |
| Pricing + remittance correctness          | 1        | 1 (unchanged; observability + tests amplify catchability)       |
| Recurring-schedule semantics              | 2        | 2 (unchanged)                                                   |
| Socket.io scale-out                       | 3        | 3 (unchanged)                                                   |
| QR handoff under bad signal               | 4        | 4 (unchanged)                                                   |
| PayMongo webhook idempotency              | 5        | Retired (idempotency 9.3 + `providerReference` unique = solved) |
| Zone capacity flagging                    | 6        | 5                                                               |
| Cash payment mix                          | 7        | 6                                                               |
| NestJS learning curve                     | 8        | 7                                                               |
| **NEW: OTP/payment abuse**                | —        | Retired (9.1 rate limiting)                                     |
| **NEW: Silent money bugs**                | —        | Retired (9.2 observability + wallet-issued-vs-redeemed alert)   |
| **NEW: Double-submit / retry dup**        | —        | Retired (9.3 idempotency)                                       |
| **NEW: Illegal Order status transitions** | —        | Retired (9.4 xstate + row locks per §10.11)                     |

---

## 10. Outside-Voice (Codex) Fixes

Codex `/plan-ceo-review` outside-voice pass returned 17 findings (6 P1, 8 P2, 3 P3). User
decisions on the 4 highest-impact ambiguities are captured here; the rest are auto-fixes to
the plan.

### 10.1 Auth contract — BFF proxy in Next.js _(user decision)_

**Fix for P1 #1** (my earlier plan contradicted itself — "httpOnly cookie" and
"Authorization: Bearer <jwt>" cannot both be true from browser JS).

Locked design:

```
Browser  ──httpOnly cookie──▶  Next.js route handler (BFF)  ──Bearer header──▶  Nest API
                                     ↑                                              ↓
                                 reads cookie                                  verifies JWT
                                 injects header
```

- Nest issues a JWT on `POST /auth/session`; Next.js route handler stores it in an
  `httpOnly + Secure + SameSite=Lax` cookie.
- All browser data fetching goes through Next.js route handlers under `/api/*`. Route
  handler reads cookie, calls Nest with `Authorization: Bearer <jwt>`, streams response back.
- React Native apps use `Authorization: Bearer` directly with platform-secure
  credential storage exposed through an audited native module.
- CSRF: Next.js route handlers verify `Origin`/`Referer` header + a double-submit token on
  mutating requests.

Cost: Next.js becomes a thin proxy (as I originally rejected). Accepted trade — XSS safety

> "no Node runtime in front."

### 10.2 Payment timing — Pay at weigh-in confirmation _(user decision)_

**Fix for P1 #2.** Locked flow:

```
1. Customer books           → Order.status = BOOKED, no payment yet
2. Rider picks up           → Order.status = PICKED_UP
3. Shop weighs              → weightKg set, pricing engine recomputes
4. Order.status = AT_SHOP   → PayMongo PaymentIntent created for final amount
5. Customer receives push   → "Weighed: X kg, ₱Y total, tap to pay"
6. Customer pays via GCash/Maya/card in-app
7. Order.status = PROCESSING (only after payment.status=SUCCEEDED)
```

**Grace period:** 15 min after AT_SHOP to pay. If unpaid, shop holds bag, notification
escalates every 30 min for 4 hours, then order enters DISPUTED. Cancellation after weigh-in
requires manual review (bag already handled).

**Cash orders (Scheduled only, opt-in):** if customer selected `paymentMethod = CASH` at
booking, skip payment intent, collect at delivery. Deferred until real cash-mix data
justifies building custody workflow (see §10.4).

### 10.3 MVP scope — Approach A (phased plan retained) _(user decision)_

**No change** to §6 phased plan. Team keeps 11-week scheduled-service build. Concierge MVP rejected —
throwaway cost > 4-week validation win.

### 10.4 Cash handling — deferred _(user decision, spec-anchored)_

Spec §9 targets ≥80% digital; cash is a 20% edge case. With pay-at-weigh-in (§10.2), cash
is opt-in only. **Deferred:** cash custody + rider remittance + shortage tracking until
real launch data shows the cash mix > 10%. Interim: cash orders flagged in Django admin
manually reconciled weekly. New tracking metric: `orders_paid_cash_ratio` — trigger
building custody workflow when > 10% sustained.

### 10.5 QR handoff → first-class `Handoff` table _(auto-fix P1 #4)_

Previous schema had one `qrToken` on `RunStop`; plan needs up to 4 handoffs per order
(pickup, drop-at-shop, pickup-from-shop, deliver). Fix — new model:

```prisma
enum HandoffStage {
  PICKUP_FROM_CUSTOMER
  DROPOFF_AT_SHOP
  PICKUP_FROM_SHOP
  DELIVER_TO_CUSTOMER
}

model Handoff {
  id           String        @id @default(cuid())
  orderId      String
  order        Order         @relation(fields: [orderId], references: [id])
  stage        HandoffStage
  nonce        String        @unique               // random 128-bit, kept even after redeem
  tokenHash    String                              // SHA-256 of signed JWT payload
  actorUserId  String?                             // rider or shop staff who scanned
  actor        User?         @relation(fields: [actorUserId], references: [id])
  geoLat       Decimal?      @db.Decimal(9,6)
  geoLng       Decimal?      @db.Decimal(9,6)
  issuedAt     DateTime      @default(now())
  expiresAt    DateTime                            // 5 min for online, 24h for offline
  consumedAt   DateTime?                           // null = unused, non-null = used
  @@unique([orderId, stage])                       // one handoff per stage per order
  @@index([nonce])
}
```

Remove `qrToken` field from `RunStop`. `POST /orders/:id/handoff` verifies signed JWT +
looks up `Handoff` by nonce + checks `consumedAt IS NULL` + writes `consumedAt = now()`
inside a `SELECT FOR UPDATE` (§10.11). Offline: tokens signed with a longer 24h TTL for
scheduled-service runs (route pre-fetched at run start), rider syncs on reconnect, server
dedups by nonce.

### 10.6 Return logistics modeled _(auto-fix P2 #8)_

New relationships on `Order`:

```prisma
model Order {
  // ... existing fields
  returnRunId       String?
  returnRun         Run?          @relation("ReturnRun", fields: [returnRunId], references: [id])
  returnWindowStart DateTime?
  returnWindowEnd   DateTime?
  returnAttempts    Int           @default(0)      // failed delivery retries
}
```

Return window = `AT_SHOP.timestamp + ShopService.turnaroundHours + zone.returnBuffer`.
Return run assigned by dispatcher when `Order.status = READY_FOR_RETURN` — same
tier-aware algorithm as pickup dispatch. Failed return (customer unavailable) → status
stays `OUT_FOR_RETURN`, attempt count++, next-day retry auto-scheduled.

### 10.7 Deterministic shop assignment _(auto-fix P2 #9)_

Promote from open-question to `dispatch.services.assignShopToOrder(order)`:

```
1. Filter shops in order.zone with active=true
2. Filter shops with ShopService active for the requested service code
3. Sort by (nearest to pickup address, ascending) using cached haversine
4. Pick first with (shop_current_load < shop_daily_capacity) — capacity per shop is
   sum of shop.services.turnaroundHours × active-order count (rough utilization proxy)
5. If none pass capacity: pick nearest active shop anyway, log ZoneShopSaturation event
6. Assignment persisted at ASSIGNED_TO_RUN transition, not at BOOKED (weigh-in happens
   at whichever shop the run drops at)
```

Deterministic + logged. No tie-break ambiguity.

### 10.8 Firebase App Check _(auto-fix P2 #10)_

Rate limiting `/auth/session` doesn't stop SMS abuse (Firebase sends OTP before Nest is
touched). Add:

- Enable **Firebase App Check** with DeviceCheck (iOS), Play Integrity (Android), and
  reCAPTCHA v3 (web BFF) at Phase 0.
- Firebase Auth phone quotas per-IP + per-device configured in Firebase console
  (100/day/IP default).
- Nest still throttles `/auth/session` for the token-exchange endpoint (session-mint abuse).

### 10.9 DB-backed idempotency for money ops _(auto-fix P2 #11)_

Redis-only idempotency insufficient for financial writes (eviction, restart). Split:

```prisma
model IdempotencyKey {
  key         String    @id                        // "{userId}:{clientKey}"
  method      String                                // "POST /orders"
  requestHash String                                // SHA-256 of body
  responseJson Json?                               // cached response
  status      String                                // "IN_PROGRESS" | "COMPLETED" | "FAILED"
  createdAt   DateTime  @default(now())
  expiresAt   DateTime                             // 24h TTL, cleaned by nightly job
  @@index([expiresAt])
}
```

- Non-money endpoints: Redis SET NX (fast path).
- Money-mutating endpoints (`POST /orders`, `POST /payments/intent`,
  `POST /credit-packs/:id/purchase`, `POST /orders/:id/handoff`): DB row inside the same
  Prisma `$transaction` as the business write. Guarantees no dup even under Redis loss.

Middleware routes to DB or Redis based on `@Idempotent({ durable: true })` decorator flag.

### 10.10 Ops-minimum split from admin-polish _(auto-fix P3 #17)_

Split Phase 5 into two phases:

- **Phase 1.5 (Weeks 4-5, parallel to Phase 2 payments):** Ops minimum — Django-admin-like
  Nest.js admin scaffolding for shop CRUD, rider onboarding, vehicle CRUD, zone-shop
  assignment, manual order override. Ships before real customers. Uses off-the-shelf
  Nest admin scaffolder or simple `@nestjs/typeorm`-adjacent React admin (react-admin
  library, points at Nest REST).
- **Phase 5 (Weeks 12-14):** Admin polish — polygon editor, capacity dashboards, dispute
  workflow UI, remittance batch review. Same `/admin/*` codebase, richer UX.

### 10.11 Order status concurrency _(auto-fix P2 #12)_

xstate guards illegal transitions but not concurrent transitions. Fix:

- All `OrdersService.transition(orderId, event)` calls run inside a Prisma `$transaction`
  with `SELECT ... FOR UPDATE` on the target Order row.
- Two concurrent transitions serialize; second gets the fresh state and re-validates via
  xstate. If new state invalid, throws `ConflictingOrderState` → 409.
- Same pattern for `CreditWallet.balance_php` updates (money-safe increments).

### 10.12 Shop membership guard _(auto-fix P2 #13)_

Role in JWT is not enough — a shop staff user may belong to multiple shops. New guard:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard, ShopMemberGuard)
@Roles('SHOP_OWNER', 'SHOP_STAFF')
@ShopMember({ paramName: 'shopId' })              // decorator names the route param
@Get('/shop/:shopId/orders')
listShopOrders(@Param('shopId') shopId: string) { ... }
```

`ShopMemberGuard` reads `req.params[paramName]`, queries `ShopMember` for
`(shopId, userId)`, denies if missing. Runs after role check.

For `/shop/orders` (no `:shopId` param — implies "my active shop"), user must have exactly
one active shop membership; if multiple, request must include `?shopId=` query param and
the guard checks that too.

Role staleness: JWT includes `tokenVersion`; wallet/roles change bumps it, next verify
rejects old token, client refreshes.

### 10.13 Run schema — multi-vehicle per zone _(auto-fix P2 #7)_

Change:

```prisma
model Run {
  // OLD: @@unique([zoneId, runDate, slot])
  // NEW:
  @@unique([zoneId, runDate, slot, vehicleId])
}
```

Adding a vehicle to a zone now creates a second `Run` row for the same `(zone, date, slot)`,
different `vehicleId`. Dispatcher fills the least-loaded run first.

### 10.14 Credits legal gate _(auto-fix P1 #6)_

Prepaid stored value with bonuses + vouchers may fall under BSP Circular 649 (electronic
money) or DTI consumer protection. Before Phase 7 ships:

- [ ] Legal review of pack sale terms (T&C, refund policy, expiry, breakage revenue)
- [ ] Accounting sign-off on liability recognition (deferred revenue vs unearned income)
- [ ] BSP e-money issuer registration review (may be exempt below threshold; verify)

Add explicit blocker to phased plan: "Phase 7 does not ship without legal + accounting
sign-off."

### 10.15 Observability scope narrowed _(auto-fix P3 #15)_

Revise §9.2:

- **Drop:** "every service method logs entry + exit" (log flood, PII leak risk).
- **Keep:** HTTP access logs (Nest interceptor), error logs (with request-id), money-path
  audit events (order status change, wallet debit/credit, remittance recorded, batch
  closed, voucher redeemed, payment success/fail), Prometheus counters/histograms.
- **New rule:** location data (rider pings) NEVER logged, only counted in metric
  (`rider_pings_total{zoneId}`) — PII/legal.

### 10.16 React Native API contract _(proposed by ADR-003)_

If ADR-003 is accepted, generate one TypeScript client from the NestJS OpenAPI
schema:

- CI runs `openapi-typescript` plus the accepted request-client generator into `packages/api-client`.
- Both mobile apps and permitted website onboarding calls import types and a typed HTTP client from
  `packages/api-client`; role-specific feature packages still remain separate.
- Contract drift = compile break in mobile builds, not runtime bug.

### 10.17 Return-of-decisions

Cross-model consensus with codex on:

- Auth contract needed fix (accepted BFF proxy)
- Payment timing needed lock (accepted pay-at-weigh-in)
- QR handoff model wrong (fixed §10.5)
- Rate-limit vs App Check split (accepted both)
- Idempotency needs DB layer (accepted §10.9)
- xstate ≠ concurrency (accepted row locks §10.11)
- Ops-min vs admin polish split (accepted §10.10)

No unresolved cross-model tensions after user decisions.

---

## 11. Eng Review Additions (2026-07-01)

Findings from `/plan-eng-review` beyond CEO + codex passes. Auto-absorbed per user's
"no clarifying stops" directive; challenge any point below.

### 11.1 Architecture

- **A1 — Rider ↔ Vehicle per-run (not 1:1).** Drop `RiderProfile.vehicleId`. Vehicle assigned
  on the `Run` row only. Rider profile keeps `onDuty`, `lastKnownLat/Lng`, `lastPingAt`.
  Resolves §7 ambiguity.
- **A2 — Zone polygon edits trigger address re-resolution.** BullMQ job `resolveAddressesForZone(zoneId)`
  fires on `Zone` update. Re-resolves all `Address` rows within the changed polygon bounding box.
  Open orders in flight get a `zoneReassigned` event; dispatcher re-checks. Add
  `AddressZoneChanged` domain event.
- **A3 — Payment webhook + order advance = atomic outbox.** PayMongo webhook handler writes
  `Transaction` + advances `Order.status` + emits `PaymentSucceeded` in a single Prisma
  `$transaction`. If webhook succeeded on PayMongo side but our DB write failed, PayMongo retries
  ⇒ dedup by `(provider, providerReference)` unique constraint.
- **A4 — WS auth refresh mid-connection.** Socket.io gateway validates JWT on connect AND on
  every event (cheap: verify signature only). On expiry, emits `auth:expired` event to client,
  client hits `/auth/refresh` via BFF, reconnects. No stuck sockets.
- **A5 — Order.code minted via Postgres sequence.** Add `CREATE SEQUENCE order_code_seq_2026`
  per year. `OrdersService.create()` calls `nextval` inside `$transaction`, formats
  `WG-2026-000001`. Concurrent-safe.
- **A6 — Dispute entity (deferred to Phase 5).** Add `Dispute` model:
  ```prisma
  model Dispute {
    id          String   @id @default(cuid())
    orderId     String   @unique
    order       Order    @relation(fields: [orderId], references: [id])
    reason      String
    openedById  String
    openedBy    User     @relation("DisputeOpener", fields: [openedById], references: [id])
    openedAt    DateTime @default(now())
    resolvedById String?
    resolvedBy  User?    @relation("DisputeResolver", fields: [resolvedById], references: [id])
    resolvedAt  DateTime?
    resolution  String?  // "CUSTOMER_CREDITED" | "SHOP_LIABLE" | "PLATFORM_LIABLE" | "NO_ACTION"
    creditAmountPhp Decimal? @db.Decimal(10,2)
  }
  ```
  Not shipped Phase 1; scaffolded in Phase 5 admin.
- **A7 — Multi-currency future-proofing.** Add `currency` column (default `'PHP'`) to `Order`,
  `Transaction`, `CreditWallet`, `RemittanceLine`, `RemittanceBatch`. Cheaper than migrating later.

### 11.2 Code quality

- **C1 — PrismaModule global singleton.** `@Global() PrismaModule` in `backend/src/prisma/`.
  `PrismaService` extends `PrismaClient`, `onModuleInit` calls `$connect`. Documented as Phase 0
  step.
- **C2 — Money helper enforced at lint.** `backend/src/common/money/money.ts` — wrappers
  `add(a, b)`, `sub(a, b)`, `mul(a, b)`, `pct(value, pctDecimal)`. Custom ESLint rule
  `no-decimal-arithmetic` bans `+`/`-`/`*` on `Decimal`-typed operands. Alt: use `Prisma.Decimal`
  namespace utilities exclusively.
- **C3 — nestjs-zod for DTO validation.** Use `nestjs-zod` (Zod-first DTOs in Nest). Same Zod
  schema powers OpenAPI generation → `openapi-typescript` on SPA → Zod schema shared with browser
  via `packages/api-types`. Ends up as: one Zod definition, three consumers.
- **C4 — Exception taxonomy.** `common/exceptions/`:
  - `BusinessException` (abstract) → maps to 4xx via Nest filter
  - `IllegalStateTransitionException`, `InsufficientCreditsException`, `PaymentFailedException`,
    `VoucherExpiredException`, `ZoneCapacityBreachedException`, `IdempotencyConflictException`
  - `SystemException` (abstract) → 5xx (unexpected)

### 11.3 Test coverage

Coverage diagram in eng-review test plan artifact
`~/.gstack/projects/Banyel3-wash-and-go/ban-main-eng-review-test-plan-*.md`.

**68 test gaps identified (0% coverage, pre-implementation).** Test framework: **Jest** +
`@nestjs/testing` for unit/integration, **Playwright** for onboarding/private-console E2E, and
**Jest + React Native Testing Library with Android/iOS smoke builds** for mobile. Add `fast-check`
(property-based) for pricing engine + wallet math.

**Test infra tasks (Phase 0):**

- Jest + ts-jest configured with Nest testing module
- Playwright bootstrapped against local Docker Postgres + Redis
- React Native Testing Library on both apps plus Detox or Maestro device flows after the proof phase
- CI runs unit + integration on every PR; E2E on merge to main
- Coverage gate: 80% line coverage on `pricing/`, `remittance/`, `credits/` (money paths)

**Regression rule:** N/A — greenfield, no existing behavior to break.

### 11.4 Performance

- **P1 — `rider_locations` compound index** `(rider_id, captured_at DESC)`. Add on
  `RiderLocationPing` model at Phase 2 introduction.
- **P2 — Prisma query analyzer in CI.** `prisma-query-inspector` fails PR if any test query
  runs > N queries per HTTP request. Threshold: N ≤ 3 for read endpoints, ≤ 10 for list endpoints
  with pagination.
- **P3 — Row lock vs optimistic concurrency.** `SELECT FOR UPDATE` reserved for hot money paths
  (`CreditWallet.balance_php`, `Order.status`). Cooler paths (`Schedule.updated_at`,
  `Shop.commissionPct`) use `version` column optimistic concurrency to reduce lock queueing.
- **P4 — TomTom route/matrix Redis cache.** Key: `distance:{lat1round4},{lng1round4}:{lat2round4},{lng2round4}:{optionsHash}`
  (round to 4dp = ~10m precision). TTL 30 days. Warm known zone-shop pairs at zone creation.
- **P5 — Socket.io Redis adapter throughput.** Note in §5.1: single Redis becomes bottleneck at
  ~50k concurrent connections. Not launch problem. Revisit at multi-city scale.

### 11.5 Distribution (React Native/Expo apps)

Not addressed in prior sections. Add Phase 4-5:

- **iOS:** EAS Build/Submit → TestFlight beta → App Store submission workflow
- **Android:** EAS Build/Submit → Play internal track → open beta → production
- **CI:** GitHub Actions triggers signed EAS builds on release tags and promotes deliberately
- **Feature flags:** consider **LaunchDarkly**, **Unleash** (self-host), or **Prisma-backed**
  simple flag table — decision deferred to Phase 4

### 11.6 Worktree parallelization strategy

**Dependency table (module-level):**

| Step                   | Modules touched                                                    | Depends on           |
| ---------------------- | ------------------------------------------------------------------ | -------------------- |
| Phase 0 foundation     | `backend/*`, both mobile apps, onboarding web, shared packages     | —                    |
| Auth module            | `backend/src/modules/auth/`, both mobile session layers            | Phase 0              |
| Users + Addresses      | `backend/src/modules/users/`, customer mobile app, TomTom adapter  | Auth                 |
| Zones + Shops seed     | `backend/src/modules/zones/`, `.../shops/`, private operations API | Phase 0              |
| Pricing engine + tests | `backend/src/modules/pricing/`, `common/money/`                    | Phase 0              |
| Orders + dispatch      | `backend/src/modules/orders/`, `.../dispatch/`, `.../routing/`     | Users, Zones, Shops  |
| Rider app happy path   | `apps/rider-mobile/*`                                              | Orders, MapsProvider |
| Private ops tooling    | manual/narrow tooling, then conditional `apps/ops-console/*`       | Orders               |
| Realtime (Phase 2)     | `backend/src/modules/realtime/` + mobile hooks                     | Orders               |
| Payments               | `backend/src/modules/payments/` + PayMongo integration             | Orders               |
| QR handoff             | `backend/src/modules/qr/`, `.../handoff/`                          | Orders               |

**Parallel lanes:**

- **Lane A (backend money):** Pricing engine + tests → Payments → Remittance (all `backend/`, sequential within lane)
- **Lane B (backend logistics):** Orders → Dispatch → Realtime → QR (sequential within lane, but starts after Users + Zones seeded)
- **Lane C (customer React Native):** Auth → Address/booking → Order tracking
- **Lane D (rider React Native):** Runs → Routes → QR/offline queue; needs Orders + MapsProvider
- **Lane E (operations):** manual procedure first; private console only after its trigger is met

**Execution order (post Phase 0 + Auth + core models):**

1. Lane A + Lane B in parallel (backend split by domain)
2. Lanes C + D + E launch as soon as their required backend endpoints have Zod DTOs merged
3. Realtime (in Lane B) synced across C/D/E via generated types

**Conflict flags:** Lane A + Lane B both touch `backend/src/prisma/schema.prisma`. Coordinate
schema migrations via one dev owning `prisma/migrations/` per phase.

### 11.7 Failure modes registry

| Codepath                           | Failure mode                          | Rescued?                                          | Test? | User sees                                                         | Logged?                                                                    |
| ---------------------------------- | ------------------------------------- | ------------------------------------------------- | ----- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `PricingService.priceOrder`        | Decimal arithmetic overflow           | N (impossible with 12,2)                          | Y     | —                                                                 | N                                                                          |
| `PricingService.priceOrder`        | Voucher applied to wrong tier         | Y (validation)                                    | Y     | 400                                                               | Y                                                                          |
| `RemittanceService.recordFor`      | Duplicate call same orderId           | Y (unique)                                        | Y     | idempotent 200                                                    | Y                                                                          |
| `PayMongoService.webhookHandler`   | Signature mismatch                    | Y (HMAC verify)                                   | Y     | 401                                                               | Y                                                                          |
| `PayMongoService.webhookHandler`   | DB write fails after PayMongo success | Y (Prisma tx rolls back → 500 → PayMongo retries) | Y     | —                                                                 | Y                                                                          |
| `QrService.verifyAndConsume`       | Token replay                          | Y (consumedAt check)                              | Y     | 409                                                               | Y                                                                          |
| `DispatchService.assignOrderToRun` | Zone at capacity                      | Y (flag + queue)                                  | Y     | order stays queued, customer sees "confirmed for tomorrow's slot" | Y                                                                          |
| `CreditsService.redeem`            | Balance underflow                     | Y (row lock + check)                              | Y     | 400                                                               | Y                                                                          |
| `Firebase Admin verifyIdToken`     | Token expired                         | Y (401 to client)                                 | Y     | forced re-OTP                                                     | Y                                                                          |
| `Socket.io fanout`                 | Redis disconnect                      | N (message dropped)                               | Y     | — silent                                                          | Y (**CRITICAL GAP** — customer sees no live update; add reconnect + resub) |

**Critical gap:** WS Redis fanout dropped messages during Redis restart. Mitigation: client polls
`GET /orders/:id` every 30s as fallback while WS is down. Add Phase 2.

### 11.8 NOT in scope

- True VRP route optimization (nearest-neighbor only, per §5.2)
- PostGIS migration (`Json` polygon at launch)
- Automated shop payout (bank transfer)
- Cash reconciliation subsystem (deferred per §10.4)
- Multi-currency operational support (schema-ready per A7, no UI/pricing changes)
- Corporate/B2B accounts (§9.6 named only)
- DST handling (PH no DST)
- Chaos test rig (would be nice; deferred to Phase 8)

### 11.9 What already exists

Greenfield — nothing to reuse internally. External libs the plan should not rebuild:

- `@nestjs/throttler` (rate limiting §9.1)
- `nestjs-pino` + `@willsoto/nestjs-prometheus` (observability §9.2)
- `xstate` v5 (state machine §9.4)
- `bullmq` (jobs)
- `socket.io` + `@socket.io/redis-adapter` (realtime)
- `firebase-admin` (auth verify)
- `paymongo` official SDK
- TomTom Search, Reverse Geocoding, Routing, Matrix, Waypoint Optimization, and Map Display APIs
- MapLibre React Native candidate renderer, subject to the Phase 0 proof gate
- `nestjs-zod` (validation §11.2 C3)
- `fast-check` (property-based tests)
- `openapi-typescript` (web codegen)
- `openapi-typescript`-based TypeScript client generation for web and mobile (§10.16)

## 12. Codex Eng Review Findings

Second codex pass on §11 found 7 P1s I missed. Absorbed inline.

### 12.1 Outbox pattern for durable events _(fixes P1 #1)_

`EventEmitter2` is in-process, not durable. Fix:

```prisma
model OutboxEvent {
  id          String   @id @default(cuid())
  aggregate   String   // "order", "payment", "wallet"
  aggregateId String
  type        String   // "OrderStatusChanged", "PaymentSucceeded", ...
  payload     Json
  createdAt   DateTime @default(now())
  publishedAt DateTime?
  attempts    Int      @default(0)
  @@index([publishedAt, createdAt])
}
```

- Business writes + `OutboxEvent` insert happen in the same Prisma `$transaction`.
- Separate BullMQ processor `outbox.processor.ts` reads `WHERE publishedAt IS NULL ORDER BY createdAt LIMIT 100 FOR UPDATE SKIP LOCKED`, publishes to Socket.io + BullMQ downstream, sets `publishedAt`, and on failure bumps `attempts` for retry.
- `EventEmitter2` still used for in-process fanout inside a request (fast path); durable is Outbox.

### 12.2 Dispatch race lock _(fixes P1 #2)_

`assignOrderToRun` currently races (`stops.count < capacity` non-atomic). Fix:

```typescript
async assignOrderToRun(orderId: string) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Advisory lock keyed on (zoneId, runDate, slot) so all assignments to same run serialize
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${runKey}))`;
    // 2. Re-fetch Run + count with lock held
    const run = await tx.run.findFirst({ where: { ... }, include: { _count: { select: { stops: true } } } });
    if (run._count.stops >= run.vehicle.capacityBags) { throw new ZoneCapacityBreachedException(); }
    const nextSeq = run._count.stops + 1;
    // 3. Insert RunStop inside same tx
    await tx.runStop.create({ data: { runId: run.id, orderId, sequence: nextSeq, qrToken: ... } });
    ...
  });
}
```

Advisory lock releases at tx end. No `RunStop` unique-constraint 409s.

### 12.3 Remittance batch uniqueness _(fixes P1 #3)_

Two workers can double-batch. Fix:

```prisma
model RemittanceBatch {
  ...
  @@unique([shopId, periodStart, periodEnd])
}
```

Plus `closeBatch()` uses `FOR UPDATE SKIP LOCKED` on lines and pg_advisory_xact_lock on `(shopId, periodStart)`. Duplicate call = 23505 unique violation → caught as `AlreadyBatched` idempotent 200.

### 12.4 Idempotency state machine _(fixes P1 #4)_

Explicit spec:

```
1. IdempotencyKey row INSERT (key, requestHash, status='IN_PROGRESS')
   - If insert fails on PK unique:
     a. Read existing row.
     b. status='IN_PROGRESS' AND created_at < 30s ago → 409 "in flight, retry later"
     c. status='IN_PROGRESS' AND created_at > 30s ago → treat as crashed; take over (advisory lock + reset)
     d. status='COMPLETED' AND requestHash matches → return cached responseJson
     e. status='COMPLETED' AND requestHash differs → 422 "same key, different body"
     f. status='FAILED' → return cached failure or retry (per endpoint policy)
2. Execute business logic inside same $transaction as the key row.
3. On success: UPDATE key SET status='COMPLETED', responseJson=<result>. Commit.
4. On failure: UPDATE key SET status='FAILED', responseJson=<error>. Commit.
5. External API calls (PayMongo) recorded separately as Transaction rows before commit; retry uses their own dedup (§10.9).
```

Middleware decorator `@Idempotent({ durable: true, ttl: '24h' })` implements this state machine.

### 12.5 Phase 1 contradiction _(fixes P1 #5)_

Phase 1 cannot ship "cash only" if §10.2 locked pay-at-weigh-in as the primary flow. Two-part fix:

- **Phase 1 (Weeks 2-4):** PayMongo GCash-only integration ships in Phase 1, not Phase 2. Cards, Maya, QR Ph deferred to Phase 2. Cash path is `paymentMethod=CASH` = ops-tracked, no product surface.
- **Phase 2 (Weeks 5-7):** Adds cards, Maya, QR Ph + realtime + QR handoff (was Phase 2 anyway).

Updates §6:

- Phase 1 gains: PayMongo GCash integration, PaymentIntent create on `AT_SHOP`, webhook receiver, Transaction ledger, wallet reconciliation basics
- Phase 2 loses: PayMongo GCash (already done) but keeps everything else + adds other rails

### 12.6 Payment due sweeper _(fixes P1 #6)_

Add fields + BullMQ repeatable:

```prisma
model Order {
  ...
  paymentDueAt DateTime?  // set when status = AT_SHOP + payment intent created
  paymentEscalationLevel Int @default(0) // 0=initial, 1=30min, 2=60min, 3=disputed
  @@index([status, paymentDueAt])
}
```

BullMQ repeatable job every 5 min: query `Order WHERE status=AT_SHOP AND paymentDueAt < NOW() AND paidAt IS NULL`, escalate per rules:

- +15 min unpaid: push notification to customer
- +30 min: SMS to customer
- +60 min: notify shop
- +4 hours: transition to DISPUTED

### 12.7 QR handoff stage order validation _(fixes P1 #7)_

Nonce dedup insufficient. Server also validates:

```typescript
async verifyAndConsume(token: string) {
  const payload = jwt.verify(token, SECRET); // sig + expiry
  const handoff = await this.prisma.handoff.findFirst({ where: { nonce: payload.nonce } });
  // Additional check: order must be in the state that PRECEDES this stage
  const requiredPreviousStatus = STAGE_PRECEDES[handoff.stage];
  const order = await this.prisma.order.findUnique({ where: { id: handoff.orderId } });
  if (order.status !== requiredPreviousStatus) {
    throw new HandoffOutOfOrderException();
  }
  // Consume + advance in one $transaction
  ...
}
```

`STAGE_PRECEDES` map:

- `PICKUP_FROM_CUSTOMER` requires `ASSIGNED_TO_RUN`
- `DROPOFF_AT_SHOP` requires `PICKED_UP`
- `PICKUP_FROM_SHOP` requires `READY_FOR_RETURN`
- `DELIVER_TO_CUSTOMER` requires `OUT_FOR_RETURN`

Offline handoffs sync to server → server checks current Order state + past handoffs, rejects if out-of-order (real-world case: rider synced pickup + delivery but not shop dropoff).

### 12.8 P2 auto-fixes absorbed

- **Indexes added:** `Run(riderId, runDate, status)`, `RunStop(orderId)`, `Order(shopId, status, scheduledPickupAt)`, `Order(returnRunId)`, `RemittanceLine(shopId, batchId, createdAt)`, `WalletTransaction(walletUserId, createdAt DESC)`, `Notification(userId, sentAt, createdAt)`, `ScheduleOccurrence(pickupDate, skipped)`, `Address(zoneId)`, `Shop(zoneId, active)`, `ShopService(serviceId, active)`.
- **WS auth revocation:** per-event verify caches `(userId, tokenVersion)` in Redis 60s TTL, so bump propagates within 1 min without waiting for reconnect.
- **Redis split:** three Redis instances (or three DBs on one instance if cost-constrained): (1) BullMQ queues, (2) Socket.io + rate limits, (3) idempotency + distance cache. Restart on any one doesn't take out all three subsystems.
- **Polling fallback jitter:** client polls `GET /orders/:id?updatedSince=<lastEventTs>` every 30±10s randomized. Server includes `Order.version` for staleness check.
- **Schedule occurrence edge tests added to test plan:** pause/cancel/edit after occurrences exist, address zone change, duplicate BullMQ runs (idempotency), cutoff times, regeneration.
- **Zone re-resolution scale:** add `Address(zoneId)` + `Address(lat, lng)` compound index. Cursor-paginate re-resolution job, batch 500 rows, skip mutation on Orders in flight (`status NOT IN (BOOKED, CANCELLED, DELIVERED)`).
- **Order code sequence:** switch to `CREATE SEQUENCE IF NOT EXISTS order_code_seq` (single global) + format `WG-{YYYY}-{padded}`. Prisma raw query on service start.

### 12.9 P3 absorbed

- **Concurrency tests** added to test plan (§11.3): explicit parallel-transaction tests for order transitions, run assignment, idempotency insert-collision, wallet debit, remittance close, webhook replay, express accept race, QR consume race.
- **Migration rehearsal:** every migration ran against a snapshot of `pg_dump`'d dev data with 100k orders seed before merging. Rollback verified.
- **Authz matrix tests:** table-driven `(role, endpoint, ownership) → allow/deny` matrix in `test/authz.spec.ts`.
- **PayMongo fixtures:** recorded webhook payloads (success, failure, replay, out-of-order) in `test/fixtures/paymongo/`.
- **Multi-currency:** kept as cosmetic — user hasn't asked for it, spec says PHP-only. §11.1 A7 downgraded from "add currency column" to "note for future migration" — reversed decision. Money field names stay `washValuePhp` etc.

---

## 13. Debate-session outside-voice findings (2026-07-17, Claude subagent)

Codex quota exhausted; independent Claude subagent reviewed the debate decisions. 15 findings.
D9 (express-lite descope) resolved the sequencing cluster. Remaining absorbed as work items:

### 13.1 Absorbed into plan (fix during scaffold/Phase 1)

- **QR/handoff schema drift (P1-1):** §2 schema still carries `RunStop.qrToken`; §10.5 already
  replaced it with the first-class `Handoff` table (4 stages, nonce, consumedAt) which works for
  express (no Run needed). Fix: apply §10.5 to §2 — drop `qrToken` from `RunStop`, add `Handoff`
  model to the canonical schema block.
- **Pay-at-weigh state machine (P1-2):** add `AWAITING_PAYMENT` to `OrderStatus` between weigh and
  PROCESSING for digital orders (Phase 2, when PayMongo lands). Cash orders bypass to PROCESSING
  and settle at delivery. `paymentDueAt` + sweeper already specced in §12.6. Unpaid-order
  escalation policy = founder decision (BUSINESS_RULES item 4).
- **Capacity check hardening (P2-6):** `expressSlotsPerDay` count uses Asia/Manila calendar-day
  boundary (`created_at AT TIME ZONE 'Asia/Manila'`), pg advisory lock keyed on `(shopId, date)`
  inside the dispatch tx (COUNT-then-insert races otherwise), CANCELLED orders excluded from the
  count (frees slots). Rider availability is the true express constraint — revisit when
  auto-dispatch lands in Phase 2-3.
- **Express return leg (P2-7):** express = two dispatch cycles (pickup→shop, shop→customer).
  Express-lite handles both as manual assignments; the Phase 2-3 auto-dispatch design must fan
  out the return leg with its own handoffs + fee attribution.
- **Monorepo mechanics (P2-9):** scaffold checklist — pin all `@tanstack/*` versions (kill
  `latest`), add `pnpm-workspace.yaml`, delete npm `package-lock.json`, align React version
  across Expo + web (Expo SDK pins win), `node-linker=hoisted` or Metro symlink config for RN in
  pnpm, extend `onlyBuiltDependencies` for Prisma/esbuild.
- **packages/ui honesty (P2-10):** it is design tokens + two renderer-specific component sets
  (web/Tailwind vs RN/nativewind), not one shared component library. Structure it as
  `packages/ui/{tokens, web, native}` from day 1.

### 13.2 Founder-sync agenda (blocking items, owners needed)

1. CEO approval of all 2026-07-17 debate decisions (D2-D9)
2. **Rider pay model** — per-leg vs per-order fee split for express's two legs; blocks rider
   recruitment (P1-4). Earnings schema (rider payout table) follows the decision.
3. TomTom proof gate owner (P3-13) — blocks maps work; no fallback provider named if the proof fails
4. Rate card (12% commission, ₱40/₱65-80 delivery, ₱7 service fee, credits/vouchers)
5. Unpaid-order escalation + cash reconciliation ownership (P1-2 tail)
6. Refund/cancel/dispute flows scoping (P2-8) — REFUND_OUT + DISPUTED exist in enums with zero
   endpoints; founders currently the manual fallback
7. Rider + shop onboarding operational flow (P2-12) — KYC, agreements, rate capture, portal
   training; intake surface is being replatformed simultaneously

### 13.3 Documentation debt (P1-5, P3-15)

- **ADR-004 required:** records surface supersessions (TanStack everywhere, laundry-portal early,
  admin-dashboard phase-gated, Next.js dropped, repo shape) with per-founder approval status.
  Until written + CEO-approved, ADR-002 remains authoritative-as-written and spec.md §2-3 +
  FRONTEND_SURFACES.md are stale.
- **ADR-003 amendment required before acceptance:** the pragmatic repository whitelist (D5.1)
  contradicts ADR-003 clause 3 as written ("Services must not inject PrismaService"). Amend text
  first, then run the express-lite slice as the acceptance gate, then flip status. Gate
  circularity note (P3-15): the slice builds under Proposed rules by definition — acceptable,
  because the gate's purpose is boundary review after real code, not enforcement during.

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status       | Findings                                                                                      |
| ------------- | --------------------- | ------------------------------- | ---- | ------------ | ---------------------------------------------------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 1    | issues_open  | 6 proposals, 6 accepted, 5 deferred (SELECTIVE_EXPANSION)                                      |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 2    | issues_found | 37 findings (17 CEO pass, 20 eng pass) — absorbed. Codex quota exhausted 2026-07-17            |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 2    | issues_open  | Run 2 (debate mode): 12 decisions locked D2-D9, 15 outside-voice findings absorbed §13         |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 0    | —            | pending — UI scope detected, recommend running                                                 |
| DX Review     | `/plan-devex-review`  | Developer experience gaps       | 0    | —            | pending                                                                                        |

- **CODEX:** prior 37 findings remain absorbed (§9-§12). Quota exhausted for debate run; Claude
  subagent served as outside voice (15 findings, §13).
- **CROSS-MODEL:** debate-run outside voice challenged the express-first cost estimate and won —
  slice descoped to express-lite (D9). Schema drift (RunStop.qrToken vs §10.5 Handoff), capacity
  race, return-leg dispatch, rider pay gap, monorepo React-skew all absorbed as work items §13.1.
  Doc-governance finding (silent ADR-002 supersession) accepted → ADR-004 required §13.3.
- **VERDICT:** ENG debate CLEARED at engineering level — every decision D2-D9 recorded with
  rationale; ALL decisions PENDING CEO APPROVAL per 3-founder governance (Clyde docs-author
  review + CEO sign-off outstanding). Run `/plan-design-review` before portal/landing UI work.

**UNRESOLVED DECISIONS:**
- CEO approval of debate decisions D2-D9 + D11 (surfaces, sequencing, ADR-003 params, dormant custom auth)
- **D10 Maps provider: TomTom vs Google Maps — final founder decision.** Leaning Google (free tier at pilot, known-good Zamboanga data, kills the unowned proof gate). If TomTom: assign proof-gate owner immediately
- Rider pay model (blocks rider recruitment + earnings schema — founder sync)
- Rate card: 12% commission, ₱40/₱65-80 delivery, ₱7 service fee, credits/vouchers (CEO)
- Unpaid-order escalation policy + cash reconciliation ownership (founder sync)
