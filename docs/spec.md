# Wash & Go — Technical Spec

> Source: _Wash & Go — AZUL Hub Pre-Acceleration Application_. This file extracts only the
> product/engineering content. Market sizing, financial projections, ROI, competitive analysis,
> SMART objectives, marketing/channel strategy, references, and certification pages are omitted
> because they do not drive the build.

---

## 1. What it is

A scheduling-first, dual-sided laundry marketplace for Zamboanga City. Customers book recurring or
one-time laundry pickups on a structured daily schedule; the platform coordinates zone-based batch
collection, partner-shop processing, and doorstep return.

The platform does **not** perform the wash — that value passes through to partner shops. The product
_is_ the coordination layer: scheduling, daily route planning, partner-shop assignment, and dispatch.

**Design principle:** all business logic — pricing, route dispatch, commission calculation,
scheduling, payment validation — lives **exclusively in the backend API**. Clients are thin.

---

## 2. Surfaces

The source application described Flutter and a shop dashboard. ADR-002 records
the accepted product-channel revision below.

| Surface                   | Tech                                | Purpose                                                                                                             |
| ------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Public onboarding website | Next.js                             | Explain the service, check coverage, collect customer/shop/rider onboarding, consent, and hand off to the apps      |
| Customer app              | React Native + Expo (iOS + Android) | Schedule pickups, track orders, pay, and manage Laundry Credits                                                     |
| Rider app                 | React Native + Expo                 | Receive runs, view route context, scan QR handoffs, share location, and track earnings                              |
| Private operations        | Deferred separate deployable        | Shop processing, exceptions, zone/fleet controls, reconciliation, and administration when pilot volume justifies it |

> The public website must not expose booking, payment, order tracking, dispatch,
> shop processing, or administration. Pilot operations begin with explicit
> manual procedures; a private console is a separate product and deployment.

---

## 3. Stack

The AZUL application was the initial proposal. The accepted architecture is
recorded in `PLAN.md` and ADR-002; this table distinguishes accepted decisions
from deferred proof-of-concept choices.

| Layer                | Accepted direction                                                       | Status                          |
| -------------------- | ------------------------------------------------------------------------ | ------------------------------- |
| Backend API          | NestJS + Fastify; backend owns business truth                            | locked                          |
| Public website       | Existing Next.js `landing-page/`; onboarding only                        | locked                          |
| Mobile apps          | React Native + Expo development builds; customer and rider apps          | locked                          |
| Private operations   | Separate authenticated deployable when operationally required            | deferred                        |
| ORM                  | Prisma                                                                   | locked                          |
| System of record     | PostgreSQL                                                               | locked                          |
| Real-time            | Socket.io with Redis fan-out; PostgreSQL remains canonical               | locked                          |
| Auth                 | Firebase Auth identity exchanged for backend session/JWT                 | locked                          |
| Maps / geo           | TomTom via backend adapters; MapLibre display spike before renderer lock | provider locked; renderer spike |
| Payments             | PayMongo fronts supported launch rails                                   | locked                          |
| Backend organization | Modular monolith with service/repository boundaries                      | **proposed in ADR-003**         |
| UI API paradigm      | REST plus OpenAPI-generated TypeScript client; GraphQL remains an option | **proposed in ADR-003**         |
| Self-hosted edge     | Nginx only if the selected VPS deployment needs a managed reverse proxy  | **proposed in ADR-003**         |

Firestore is not a second business-data store. PostgreSQL is canonical; Redis
and Socket.io provide ephemeral delivery and fan-out. TomTom results are
normalized behind a `MapsProvider` interface and important route decisions are
persisted for auditability.

The three proposal rows do not become build requirements until ADR-003 is
accepted. The plain-language business behavior is summarized in
`docs/startup-grind/01-product/BUSINESS_RULES_PROPOSED.md`.

---

## 4. Core domain

Inferred entities (source describes behavior, not a schema — this is a starting model, not gospel):

- **User** — roles: customer, rider, shop, admin
- **Zone** — geographic coverage area; one primary Piaggio assigned; has a daily capacity ceiling
- **Shop** (partner) — processes orders; receives 88% remittance
- **Rider** — Piaggio driver (Tier 1) or partner motorcycle (Tier 2)
- **Vehicle** — Piaggio Ape Cargo (platform-owned) or partner motorcycle
- **Schedule** — recurring or one-time pickup slot, tied to a customer + zone
- **Order** — a single laundry job (weight, service type, tier, status, price breakdown)
- **Run / Route** — a batched set of orders for one vehicle on one scheduled run
- **Transaction / Payment** — customer payment, method, processing cost
- **Remittance** — shop payout ledger entry (wash value minus commission)
- **CreditWallet** — prepaid stored value per customer
- **Voucher** — scheduled-delivery voucher granted by credit packs

---

## 5. Logistics: two-tier model

|              | Tier 1 — Scheduled Piaggio Batch (default)     | Tier 2 — Express Motorcycle (exception)    |
| ------------ | ---------------------------------------------- | ------------------------------------------ |
| Vehicle      | Platform-owned Piaggio Ape Cargo, one per zone | Partner-owned motorcycle, dynamic dispatch |
| Handles      | All recurring + scheduled orders               | Urgent / same-day / light-load (≤5 kg)     |
| Capacity     | ~10 bags per run, multiple scheduled runs/day  | On-demand                                  |
| Delivery fee | ₱40                                            | ₱65–₱80                                    |

**Zone capacity logic:** a zone's daily ceiling = `runs_per_day × bags_per_run`. When a zone nears
its ceiling, the admin surface flags it for subdivision and triggers evaluation for an added Piaggio.
Adding a vehicle to an adjacent zone shrinks coverage areas and tightens routes (efficiency gain,
not just capacity). This flagging/subdivision logic is a real backend + admin feature, not a manual
process.

---

## 6. Pricing & fee engine (backend)

Representative order = 6 kg × ₱25/kg = ₱150 wash value.

| Component          | Value                          | Flow                                 |
| ------------------ | ------------------------------ | ------------------------------------ |
| Wash value         | ₱25/kg × weight                | Billed to customer, pass-through     |
| Shop remittance    | 88% of wash value              | Paid to shop                         |
| Commission         | 12% of wash value              | Platform revenue                     |
| Delivery fee       | ₱40 (Tier 1) / ₱65–80 (Tier 2) | Platform revenue, checkout line item |
| Service fee        | ₱7 flat                        | Platform revenue, covers processing  |
| Payment processing | ~4.5% of customer bill (~₱9)   | Variable cost                        |

The engine must compute: customer total (`wash + delivery + service`), platform gross
(`commission + delivery + service`), and shop remittance — per order, per tier.

---

## 7. Laundry Credits (stored-value wallet)

Prepaid packs granting bonus credits + delivery vouchers. This is a real accounting subsystem:
issued value, bonus liability, voucher redemption, and balance tracking.

| Pack   | Bonus | Credits received | Vouchers               |
| ------ | ----- | ---------------- | ---------------------- |
| ₱250   | 5%    | ₱262.50          | —                      |
| ₱500   | 10%   | ₱550.00          | 1 scheduled delivery   |
| ₱1,000 | 15%   | ₱1,150.00        | 2 scheduled deliveries |
| ₱2,000 | 20%   | ₱2,400.00        | 5 scheduled deliveries |

Redemption logic (credits and vouchers applied at checkout) must reconcile against the pricing
engine in §6.

---

## 8. Service catalogue (Zamboanga rates, for pricing config)

| Service                 | Rate                |
| ----------------------- | ------------------- |
| Wash, dry & fold        | ₱25/kg avg (₱22–30) |
| Wash, dry & fold (8 kg) | ₱180–200            |
| Wash + iron             | ₱220–280 / 8 kg     |
| Dry cleaning (garment)  | ₱80–150 / piece     |
| Wedding gown            | ₱500–1,200 / piece  |

Rates should be data-driven (per-shop, per-service config) rather than hardcoded — supplier/shop
rate capture is a known variable.

---

## 9. Key flows

**Scheduled (Tier 1):** customer books recurring/one-time slot → backend assigns zone + adds to a
daily run → Piaggio batch-collects → transported to nearest partner shop → processed → returned
within turnaround window. QR scan confirms handoffs.

**Express (Tier 2):** customer requests urgent/light-load → backend dispatches a partner motorcycle
at premium fee → direct-to-shop priority processing → express return.

**Payment:** GCash / Maya / PayMongo; ≥80% digital-payment mix is a stated operational target
(affects cash-reconciliation design).

---

## 10. Open questions (resolve before building)

1. **TomTom field validation** — numeric pass threshold for Zamboanga address
   search, reverse geocoding, and route accuracy after a representative test set exists.
2. **Map renderer** — raster or vector TomTom display through MapLibre after Android/iOS proof.
3. **Private operations trigger** — volume/error threshold that justifies a separate ops console.
4. **"Route optimization" scope** — true optimization (VRP-style) vs. an ordered stop list. Large
   effort delta.
5. **Surface ownership** — which founder-dev builds which surface (lead dev owns backend + integrations).
6. **Rate/shop config model** — per-shop, per-service pricing capture and storage.
7. **Recurring-schedule semantics** — cadence options, skip/pause, holiday handling, slot capacity.
