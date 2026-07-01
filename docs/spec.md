# Wash & Go — Technical Spec

> Source: *Wash & Go — AZUL Hub Pre-Acceleration Application*. This file extracts only the
> product/engineering content. Market sizing, financial projections, ROI, competitive analysis,
> SMART objectives, marketing/channel strategy, references, and certification pages are omitted
> because they do not drive the build.

---

## 1. What it is

A scheduling-first, dual-sided laundry marketplace for Zamboanga City. Customers book recurring or
one-time laundry pickups on a structured daily schedule; the platform coordinates zone-based batch
collection, partner-shop processing, and doorstep return.

The platform does **not** perform the wash — that value passes through to partner shops. The product
*is* the coordination layer: scheduling, daily route planning, partner-shop assignment, and dispatch.

**Design principle:** all business logic — pricing, route dispatch, commission calculation,
scheduling, payment validation — lives **exclusively in the backend API**. Clients are thin.

---

## 2. Surfaces

| Surface | Tech | Purpose |
|---|---|---|
| Customer app | Flutter (iOS + Android) | Schedule recurring/one-time pickups, real-time order tracking, digital payment (GCash/Maya), buy Laundry Credits |
| Rider app | Flutter | Daily route dispatch, navigation, order confirmation via QR scan, earnings tracking |
| Shop dashboard | Next.js (browser, no install) | View incoming scheduled orders, update processing status, track earnings |
| Admin dashboard | *(unspecced — see Open Questions)* | Zone/fleet management, capacity-ceiling flags, route config, expansion evaluation |

> Note: the admin dashboard appears in the ops-cost section and the Year-0 Gantt but is **absent from
> the product-platform table**. Its scope needs to be defined — standalone surface vs. a role-gated
> section of the shop dashboard.

---

## 3. Stack (proposed in the application — nothing locked)

This is the stack the application document names. Treat all of it as a starting proposal to debate
during planning, not a settled decision — including the backend framework itself. The application
proposes NestJS, but whether that (vs. e.g. Fastify/Express, a Django/FastAPI Python backend, Go,
or something else) is the right fit for this problem and this team is an open call to make on the
first planning pass. The only genuinely fixed shapes are the *surface topology*: a single backend
that owns all business logic, a web dashboard for shops, and mobile apps for customers and riders —
the frameworks behind each are all up for review.

| Layer | Application's proposal | Status |
|---|---|---|
| Backend API | NestJS (all business logic; single source of truth) | open |
| Web dashboard | Next.js (shop dashboard) | open |
| Mobile apps | Flutter (customer + rider) | open |
| ORM | Prisma | open |
| System of record | PostgreSQL | open |
| Real-time | Firestore (order/rider status live updates) | open |
| Auth | Firebase Auth | open |
| Maps / geo | Google Maps (zone mapping + route optimization) | open |
| Payments | PayMongo, GCash, Maya | open (PayMongo can front GCash/Maya) |

**Open architectural boundary:** if PostgreSQL + Firestore both stay, PostgreSQL should be
canonical and Firestore a live-view/push layer — but the exact split (what is written to which,
sync direction, source of truth on conflict) is **not defined in the source** and must be decided
before building. This dual-store design is itself worth challenging: a single Postgres store with a
push mechanism may be simpler for a small team. Do not let both stores own the same truth.

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

| | Tier 1 — Scheduled Piaggio Batch (default) | Tier 2 — Express Motorcycle (exception) |
|---|---|---|
| Vehicle | Platform-owned Piaggio Ape Cargo, one per zone | Partner-owned motorcycle, dynamic dispatch |
| Handles | All recurring + scheduled orders | Urgent / same-day / light-load (≤5 kg) |
| Capacity | ~10 bags per run, multiple scheduled runs/day | On-demand |
| Delivery fee | ₱40 | ₱65–₱80 |

**Zone capacity logic:** a zone's daily ceiling = `runs_per_day × bags_per_run`. When a zone nears
its ceiling, the admin surface flags it for subdivision and triggers evaluation for an added Piaggio.
Adding a vehicle to an adjacent zone shrinks coverage areas and tightens routes (efficiency gain,
not just capacity). This flagging/subdivision logic is a real backend + admin feature, not a manual
process.

---

## 6. Pricing & fee engine (backend)

Representative order = 6 kg × ₱25/kg = ₱150 wash value.

| Component | Value | Flow |
|---|---|---|
| Wash value | ₱25/kg × weight | Billed to customer, pass-through |
| Shop remittance | 88% of wash value | Paid to shop |
| Commission | 12% of wash value | Platform revenue |
| Delivery fee | ₱40 (Tier 1) / ₱65–80 (Tier 2) | Platform revenue, checkout line item |
| Service fee | ₱7 flat | Platform revenue, covers processing |
| Payment processing | ~4.5% of customer bill (~₱9) | Variable cost |

The engine must compute: customer total (`wash + delivery + service`), platform gross
(`commission + delivery + service`), and shop remittance — per order, per tier.

---

## 7. Laundry Credits (stored-value wallet)

Prepaid packs granting bonus credits + delivery vouchers. This is a real accounting subsystem:
issued value, bonus liability, voucher redemption, and balance tracking.

| Pack | Bonus | Credits received | Vouchers |
|---|---|---|---|
| ₱250 | 5% | ₱262.50 | — |
| ₱500 | 10% | ₱550.00 | 1 scheduled delivery |
| ₱1,000 | 15% | ₱1,150.00 | 2 scheduled deliveries |
| ₱2,000 | 20% | ₱2,400.00 | 5 scheduled deliveries |

Redemption logic (credits and vouchers applied at checkout) must reconcile against the pricing
engine in §6.

---

## 8. Service catalogue (Zamboanga rates, for pricing config)

| Service | Rate |
|---|---|
| Wash, dry & fold | ₱25/kg avg (₱22–30) |
| Wash, dry & fold (8 kg) | ₱180–200 |
| Wash + iron | ₱220–280 / 8 kg |
| Dry cleaning (garment) | ₱80–150 / piece |
| Wedding gown | ₱500–1,200 / piece |

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

1. **Stack review (everything open)** — the entire stack in §3 is the application's proposal, not a
   locked decision. This includes the backend framework itself: NestJS is proposed, but Fastify,
   Express, a Python (Django/FastAPI) or Go backend, etc. are all fair to debate for fit with this
   problem and this team. Only the surface topology (one backend, one web dashboard, mobile apps) is
   fixed; the frameworks are not.
2. **PostgreSQL ↔ Firestore boundary** — whether to keep both at all; if kept, what is canonical,
   what is push-only, and the sync model.
3. **Admin dashboard** — standalone 4th surface or role-gated Next.js routes in the shop dashboard.
4. **"Route optimization" scope** — true optimization (VRP-style) vs. an ordered stop list. Large
   effort delta.
5. **Surface ownership** — which founder-dev builds which surface (lead dev owns backend + integrations).
6. **Rate/shop config model** — per-shop, per-service pricing capture and storage.
7. **Recurring-schedule semantics** — cadence options, skip/pause, holiday handling, slot capacity.
