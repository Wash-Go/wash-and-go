# Evidence pack: internal (Wash & Go, Zamboanga)
Repo: /Users/ban/dev/wash-and-go · as of 2026-10-25 · read-only · line refs verified by grep/sed unless marked ~

Debate: (1) CUSTOMER concierge brand (we set public per-kg price, shops = suppliers) vs (2) SHOP platform/tool (shops set prices, customer books shop, weigh-in can change final cost).

## A. Pricing + fee defaults (code)
| Path:line | Fact |
|---|---|
| apps/api/src/platform-config/platform-config.service.ts:108 | `serviceFeePhp` default `SERVICE_FEE_PHP` = 7 |
| :109 | `deliveryBasePhp` default 40 |
| :110-113 | deliveryFreeKm 2, deliveryPerKmPhp 8, deliveryMaxPhp 150, deliveryRoadFactor 1.3 |
| :114 | maxResolveKm 20 |
| :115 | expressWeightThresholdKg 6 |
| :116-117 | minOrderPricePhp 0, platformFeePhp 0 (both default 0) |
| :119 | riderCodCapPhp 1500 (max outstanding COD before rider dispatch pauses) |
| apps/api/src/pricing/distance.ts:37-45 | delivery = min(base + max(0, 2×km×1.3 − 2)×8, 150). One formula. No ₱65-80 express tier in code |
| apps/api/src/pricing/pricing.ts:53-58 | commission = wash×pct (carved OUT of wash); remit = wash − commission; customer total = wash + delivery + service |
| apps/api/prisma/schema.prisma:192 | `Shop.commissionPct` default 12.00 |
| apps/api/src/shops/dto/admin-shops.dto.ts:26,35 | commissionPct settable by ADMIN only (0-100) |
| apps/api/src/shops/shops.service.ts:56 | commissionPct + expressSlotsPerDay omitted from shop-facing view ("margin data") |
| apps/api/src/shops/shop-onboarding.service.ts:17 | owner view has NO margin fields |
| Worked example (code math, verified in Money-Flow docx): 6 kg × ₱25 = ₱150; commission ₱18; remit ₱132; delivery ₱40 at 0.6 km; service ₱7; customer ₱197; platform keeps ₱65 | |

## B. Weigh-in, estimate, variance (code + UI copy)
| Path:line | Fact |
|---|---|
| apps/api/src/orders/load.ts:17-19 | load estimates: Small 3 kg, Medium 6 kg, Large 9 kg |
| :25 | MAX_WEIGH_KG = 50 (refuses above, "typo" guard) |
| :36-40 | Express-eligible iff estimate ≤ threshold (6 kg). Over → Scheduled |
| apps/api/src/orders/orders.service.ts:163-171 | Express over-limit error: "use our Scheduled service" |
| :124 | delivery recomputed from km via computeDeliveryFee |
| :575-577 | shop may RE-WEIGH while AT_SHOP or PROCESSING; latest weight is billed |
| :578-636 | weigh(): recomputes washValue, delivery, service, commission, remittance, customerTotal from actual kg (sets final bill) |
| :666-667 | READY_FOR_RETURN refused without a recorded actual weight ("Weigh this order before marking it ready") |
| apps/laundry-portal/lib/weigh.ts:54 | second confirm iff entered > 2× estimate OR delta > 5 kg |
| :81-84 | button copy: "Confirm ₱X" (second: "Yes, confirm ₱X") |
| apps/customer-mobile/src/app/book.tsx:135 | "An estimate only, the shop weighs it at pickup and sets the final price." |
| apps/customer-mobile/src/app/checkout.tsx:214 | "Delivery adjusts by distance · final weight at the shop." |
| apps/customer-mobile/src/app/checkout.tsx:213 | shows Total (`customerTotalPhp`) before confirm |

Who absorbs variance (as built): customer pays the actual weighed bill. No customer approval step, no cap, no price-change consent. Shop enters kg and confirms. Over-estimate customer approval deferred to slice B7 (docs/plans/2026-10-19-laundry-portal-full.md:13-15).

### "Confirm ₱X" wording conflict
- DECIDED: docs/plans/2026-10-19-laundry-portal-full.md:13-15 ("Wording is 'Confirm ₱X' (not 'send for approval')"). Code matches (weigh.ts:81-84).
- STALE: docs/plans/2026-10-19-laundry-portal-full.md:91 still says "Send ₱385.40 for approval". DESIGN.md:295 also says "Send ₱385.40 for approval". personal-docs/ui-ux-plan-2026-09-28.md:85 same.
- Mock still shows "Confirm ₱149.50" / "Yes, confirm ₱537.00": docs/design/portal-preview.html:400, 421, 567. Demo runbook: docs/demo/portal-demo-runbook.md:83, 135.
- Earlier weigh bug: personal-docs/ui-ux-plan-2026-09-28.md:19 and docs/plans/2026-09-28-u0-audit-fixes.md:100 (70 kg on ~6 kg → ₱1,797 with "normal confirm").

## C. Shop onboarding / shop-set fields
| Path:line | Fact |
|---|---|
| apps/api/src/shops/dto/shop-services.dto.ts:8-10 | shop sets per service: `ratePhp` (>0, ≤99999, 2dp), `turnaroundHours` (1-720), `active` |
| apps/api/prisma/schema.prisma:42, 249 | BillingUnit: PER_KG / PER_PIECE / FLAT |
| apps/api/src/shops/dto/shop-profile.dto.ts:44 | `expressSlotsPerDay` 0-50 (shop-settable in profile DTO; admin DTO also sets it) |
| apps/api/src/shops/dto/shop-profile.dto.ts:25-47 | profile: name, address, lat/lng, contactPhone, description, hours, logo |
| apps/api/src/shops/dto/shop-onboarding.dto.ts:11-15 | onboarding: permitKey, photoKeys (≤8) |
| apps/api/prisma/schema.prisma:204-206 | PayoutMethod: GCASH, BANK |
| Wash-and-Go-Onboarding.docx (repo root) status flow: DRAFT → SUBMITTED → VERIFIED → REJECTED; admin-created shops go straight to VERIFIED (Wash-and-Go-Onboarding.docx) |
| apps/api/src/orders/shop-match.ts:1-12 | auto-match rank: express capacity → distance → turnaround → rating (tiebreak only) |
| personal-docs/auto-match-dynamic-config-plan.md:38-50 | "customer never HAS to pick a laundry": nearest shop shown with its own rate ("Nearest: Tetuan Laundry Hub · ₱25/kg"); "Change laundry" available; price = assigned/chosen shop's rate, "No platform standardization" |
| apps/customer-mobile/src/app/change-laundry.tsx:107 | customer sees each shop's `ratePhp`/kg + turnaround + distance |
| docs/startup-grind/01-product/BUSINESS_RULES_PROPOSED.md:48-64 | Scheduled = grouped runs, ~10 bags/run (pilot to validate); Express = partner motorcycle, fee "remains proposed" |
| docs/startup-grind/01-product/BUSINESS_RULES_PROPOSED.md:82-95 | customer price = shop charge + delivery + service fee − discounts; figures are "planning assumptions, not final launch promises" |
| docs/startup-grind/01-product/BUSINESS_RULES_PROPOSED.md:101-106 | final charge = shop's MEASURED weight; customer must be shown final amount before payment deadline |
| docs/startup-grind/01-product/BUSINESS_RULES_PROPOSED.md:148-160 | open approvals: rate card, commission, fees; cash acceptance; multi-shop zone selection; capacity split |

## D. Rate card status (plans, all say PENDING)
- PLAN.md:61-62, 1122-1123, open: service fee ₱7 per order vs per bag; Scheduled ₱40 flat vs distance-tiered.
- PLAN.md:303, commission "default 12%, PENDING founder rate card".
- PLAN.md:1948-1954 (§13.2 item 4), founder-sync agenda: "Rate card (12% commission, ₱40/₱65-80 delivery, ₱7 service fee, credits/vouchers)".
- apps/landing-page/NEED_BUSINESS_INFO.md (§1, rate card 🔴): wash ≈ ₱25/kg "indicative", commission 12% "not shown publicly". Key ambiguity: if prices are per-shop, site "must say 'from ₱X' or 'varies by shop'."
- docs/startup-grind/01-product/BUSINESS_RULES_PROPOSED.md:150-156, same open list.
- personal-docs/friday-express-slice-plan.md:73, seed "₱25/kg, 12%, ₱65-80 express, ₱7, all PROPOSED, founder card pending".

## E. Fee conflict ₱13 vs ₱7 (verbatim)
| Source | Value |
|---|---|
| personal-docs/source/alpha-v1.0-features.md:625 | "Platform Service Fee | ₱13 flat per transaction | Customer, covers payment processing" |
| alpha:643 (Table 4) | service fee 13 |
| alpha:644 | "Customer's total bill | 198 | = 150 wash + 40 delivery + 13 service" |
| alpha:645 | "Platform gross revenue per order | 66 | = 18 + 35 + 13" |
| alpha:647 | net contribution 57 |
| alpha Table 7 (:749-761) | service fees Y1 ₱0.245M = 18,840 × ₱13 |
| docs/spec.md:121 | service fee ₱7 flat, "covers processing" |
| docs/spec.md:122 | payment processing ~4.5% of customer bill (~₱9) |
| apps/landing-page/src/content/site.ts:~206-207 | REVENUE_STREAMS_NOTE: "Business-plan rates... app screenshots show test values" |
| apps/landing-page/src/content/site.ts:218 | `SHOW_UNIT_ECONOMICS = false` (Table 4 hidden) |
| docs/plans/2026-10-19-investor-landing.md:31 | "code default is ₱7, founders to confirm" |
| Wash-and-Go-Money-Flow.docx | ₱197 order = 150 + 40 + 7; platform keeps ₱65 |

## F. Table 4 arithmetic (investor deck source)
- alpha:642 delivery row = 40. alpha:644 total says "150 + 40 + 13" but prints 198. 150+40+13 = 203.
- alpha:645 gross "18 + 35 + 13" = 66. Uses 35, not 40. With 40: gross 71, net 62.
- alpha Table 7 delivery revenue Y1 ₱0.659M ÷ 18,840 orders = ₱35/order. P&L also uses 35.
- Code says 198 = 150 + 35 + 13 in site.ts comment (site.ts ~L218-ish block, "bill (198 = 150 + 35 + 13)").
- Conclusion for debate: unit economics not reconciled. Flagged in site.ts and in docs/plans/2026-10-19-investor-landing.md (Table 4 fix item).

## G. Market sizing + projections (alpha doc, founders' own numbers)
| Line | Fact |
|---|---|
| :517-518 | "78% of respondents identifying laundry as their most disliked household chore" (cited Inquirer 2019; not own survey) |
| :524-527 | washing-machine ownership 49–54%; ~3% lowest-income (Euromonitor 2025, PSA 2024) |
| :530-536 | shops "fragmented and digitally invisible"; 119 shops; ₱25/kg city avg (LaundryAtlas 2026); "no existing laundry platform" |
| :681-690 (Table 4 bottom-up) | 119 shops × ₱45k–₱90k/mo gross × 12 = TAM ₱64M–₱129M/yr ("Field estimate") |
| :697-708 (Table 5 top-down) | ₱34M–₱46M/yr (Statista 2021 ×0.9% pop × 0.75 income adj.) |
| :724-728 (Table 6) | TAM ~₱60–110M/yr; SAM ~₱24–44M (~40%); SOM Y1 wash GMV ₱2.83M (18,840 × ₱150); Y3 ₱3.82M (25,459 orders) |
| :738-741 | 4 Piaggios fixed; 12 bags/run target; utilization 30%→80% Y1; 80% Y2; 85% Y3 |
| :749-761 (Table 7) | net: Y1 (₱0.189M), Y2 +₱0.066M, Y3 +₱0.116M; cumulative ≈ 0 by end Y3 |
| :776 (Table 9) | operational break-even M7 |
| :801-805 (Table 10) | critical: 12 bags/run avg; 63% Y1 util; 8–12 bags by M6; retention >70% week-over-week; ~80% digital payment; ~6 kg avg order ("smaller orders break the ₱18 commission") |
| PLAN.md:155-160 | direct GCash/Maya rails "only justified when take-rate becomes material (~₱1M GMV/month)" |

Note: alpha:840 says "119 shops surveyed" but alpha:1008-1010 says field price survey across 15–20 shops "is recommended" (not done). Contradiction.

## H. Competitors (names + claims)
| Source | Named | Claim |
|---|---|---|
| alpha:818 | Walk-in shops (119 in ZC) | cash-only, paper, no booking |
| alpha:819 | GrabFood, Foodpanda | "20–30% commission" |
| alpha:820 | GrabExpress, Lalamove | point-to-point, no scheduling |
| alpha:821 | informal Messenger/phone pickup |, |
| DESIGN.md:230 | Xavier's Wash & Go (xavierslaundry.com, "local competitor") |, |
| DESIGN.md:326 | "both local competitors lead with 'not mixed'" | custody fear, research note |
| DESIGN.md:230 | Laundryheap, Poplin (reference sites) |, |
| personal-docs/ui-ux-plan-2026-09-28.md:129 | Xavier's Wash & Go |, |
| personal-docs/source/alpha-v1.0-features.md:934 | Suds Laundry & Dryclean (cited for price geography; location not stated) |, |

Research assets: ~/.gstack/projects/Banyel3-wash-and-go/designs/research/ contains only 4 PNGs (gcash, laundryheap, poplin, xaviers mobile). Not in repo.

## I. Zamboanga laundries named
Count of REAL named ZC shops: 4 incl. one competitor brand.
1. Tetuan Laundry Hub: alpha:25 (shop in coverage list); personal-docs/auto-match-dynamic-config-plan.md:44; docs/design/portal-preview.html:265 (sample shop, "Tetuan Laundry Hub, Don Alfaro St."). Rates ₱25/kg wash, ₱40 delivery, ₱7 fee, 88% payout.
2. Guiwan Wash Center: alpha:25 (only).
3. Labada de Victoria: alpha:1001 ("field-confirmed at ₱25/kg"). No address.
4. Xavier's Wash & Go: DESIGN.md:230 (local competitor).
Test/fixture names (not real): "Smoke Laundry" (e2e/tests/admin-shops.spec.ts:18), "E Laundry" (e2e/tests/laundry-portal-onboarding.spec.ts:22). "Tetuan Laundry Hub" recurs in e2e fixtures.

## J. Market rates per kg (referenced)
| Source | Rate |
|---|---|
| alpha:1001 + table at :~1000 | ZC wash-dry-fold ₱25/kg avg (₱22–30 range) |
| alpha:~1001 | 8 kg load ₱180–200; wash+iron ₱220–280 / 8 kg (+₱40–80); dry clean ₱80–150/piece; gown ₱500–1,200/piece |
| alpha:~884-904 (Table 1, national) | wash-dry-fold ₱45–80/kg (LaundryAtlas); heavy ₱90–150/kg; full-service regular ₱23–33/kg; wash+press ₱45–55/kg; self-serve ₱50–85/load |
| alpha Table 2 (:936+) | Metro Manila ₱50–90/kg; BGC ₱39–99; Iloilo ₱28–55; CDO ₱30–60/load |
| alpha:952 / 960-972 | several named-source ranges (LaundryAtlas, Laundry Services Price List) |
| docs/spec.md:150-154 | ZC catalogue: ₱25/kg (22–30), 8 kg ₱180–200, wash+iron ₱220–280/8kg, dry clean ₱80–150/piece, gown ₱500–1,200 |
| docs/demo/portal-demo-runbook.md:51 | demo shop: wash/dry/fold ₱25/kg, wash+iron ₱35/kg, dry clean ₱120/piece |
| e2e/tests/laundry-portal-services.spec.ts:91 | test rate 27.50/kg |

## K. Customer research / shop interviews
- Own customer survey: NONE in repo.
- Own shop interviews / shop visits / LOIs / partner commitments: NONE found (grep: interview, survey, LOI, verbal, commit).
- Only secondary data above (sections G, H). Field price survey of 15–20 shops: recommended, not evidenced done (alpha:1008-1010).
- DESIGN.md:219, 326: "research and independent voice converged: local customers fear losing track of clothes with strangers" (Claude-generated "Suki Ledger" voice; Codex unavailable; DESIGN.md:326). Not a survey.
- Partner shop agreement: none. Pilot = 1–2 partner laundries (docs/plans/2026-10-25-pilot-test-ready.md:15).

## L. Coaches / investors / incubator
- Hermosa: zero hits in repo (grep -i hermosa, all tracked text).
- Coach quotes: zero hits (grep -i coach).
- Incubator actually named: AZUL Hub, Ateneo de Zamboanga (ADZU-TBI). alpha:1143 (address), alpha:1153 "Application Deadline: June 15, 2026". Also apps/landing-page/src/content/site.ts INCUBATOR_LINE; docs/plans/2026-10-19-investor-landing.md:39. Pre-acceleration application.
- alpha:1169-1179 Remaining deliverables: Gabrielle Tatel (Business) = update pitch deck, revise financial model, validate unit economics for Express and Scheduled logistics, update revenue projections; Clyde (UI/UX) design system.
- Investor-facing copy: apps/landing-page/src/content/site.ts (team, stats). NEED_BUSINESS_INFO.md §7 "100,000+ pounds cleaned / 500+ orders / 1000+ satisfied clients" = carried from Figma; unverified.
- Investor landing ask: "Request the deck" mailto (docs/plans/2026-10-19-investor-landing.md:19).

## M. Landing page claims (apps/landing-page/src/content/site.ts)
- :59 PROBLEM_STATS: 6.5 h/day; 78%; 49–54%.
- :80 SHOP_SIDE: 119 shops, ₱25/kg (LaundryAtlas).
- :122-127 SERVICE_TIERS: Express = "6 kg or below", tier "E-bike"; Scheduled = any size, Piaggio; Business B2B.
- :158 "Periodic payouts in per-shop batches, carrying 88% of the wash value."
- :206-207 REVENUE_STREAMS_NOTE (see E).
- :220-275 UNIT_ECONOMICS hidden (see F); MARKET_SIZING :275.
- :341 COMPETITION ("Wash & Go's commission is 12%").
- :378 QUALITY_LINE: 42 API spec files, 434 unit tests, 12 Playwright specs.
- Customer-facing copy rule: "Nothing here is invented: if the doc does not say it, it is not on the page." (site.ts header)
- Hero stat in NEED_BUSINESS_INFO §7: "100,000+ pounds / 500+ orders / 1000+ satisfied" unverified.

## N. Brand positioning (DESIGN.md)
- :219 "Customers hand their clothes to a partner shop and a rider they have never met... the product's job is custody." Core question: who has my clothes, what did they weigh, what do I owe.
- :219 product context: "Platform auto-matches a verified partner shop; a platform rider does pickup and return; cash on delivery at launch." (also at :219-221)
- :233-235 "Faces and barangays before maps: the named rider, the named shop, the barangay on every stamp." Notably names the shop.
- :326 "custody trail" from research. 
- :331 "Logo leads" (2026-10-19).
- Rider mode: Sun Mode. Portal mode: "compact, error-proofed money inputs" (:221-ish).
- Note: DESIGN.md brand copy is shop-agnostic at the top level (platform auto-matches) but names the shop in every stamp.

## O. Phases, zones, cash, ops, shops
- PLAN.md:1011-1014 express-first build, dual-service launch (D4).
- PLAN.md:1037-1061 Phase 1 Express-LITE, manual rider assignment, cash recorded manually.
- PLAN.md:1063 Phase 2 payments; 1072 Phase 3 Scheduled engine (weeks 5-9); 1082 Phase 4 shop config + remittance batching.
- PLAN.md:971 / :1003 digital ≥80% target; cash = 20%. :1339-1346 cash deferred; build custody when cash >10% sustained.
- PLAN.md:1312-1333 pay-at-weigh-in: AT_SHOP → PaymentIntent for final amount → customer pays; 15-min grace; DISPUTED after 4h.
- PLAN.md:155-168 PayMongo only; manual pilot, then private console (ops-console) when volume crosses threshold.
- Zones: spec.md:94-108 zone = one Piaggio per zone; capacity = runs/day × bags/run; zone subdivision flagging (real feature). Zamboanga zones: alpha:25 "coverage zone (admin-editable)"; NEED_BUSINESS_INFO §2 "no defined service-zone list or map yet". Barangays named in alpha: Talon-Talon, Mampang, Tetuan (alpha ~L668 segment table); "Zones A–C" (alpha ~L853 barangay captain partnerships). Zone count: none fixed.
- Shop count: 119 (LaundryAtlas, all ZC walk-ins). Partner shops live: 0 verified in repo (pilot = 1–2, docs/plans/2026-10-25-pilot-test-ready.md:15).
- Pilot: closed, 1–2 partner laundries, 2–4 riders, invited customers, COD now (pilot-test-ready.md:15-20).
- Rider pay: undecided (PLAN.md:1948-1950 item 2 per-leg vs per-order; pilot-test-ready.md:26-28 "decided at founder sync... flat per leg, delivery-fee pass-through, or a percentage").
- Money-Flow docx: rider collects whole ₱197 and deposits; platform pays shop ₱132 in weekly batch; keeps ₱65 out of which rider pay comes.
- Payments comparison (docs/plans/2026-10-25-pilot-test-ready.md:210-232). Pilot default = COD + manual GCash/Maya; PayMongo weekly payout is "dealbreaker" per Ban (:214). Provider pick = Ban.
- Cost Matrix docx: PayMongo GCash 2.23%, QR Ph ~1.34%, card 3.125% + ₱13.39; "only when online launches".

## P. Governance / open decisions
- PLAN.md:3, 8-10: all 2026-07-17 debate decisions "PENDING CEO APPROVAL"; Ban accepted; Clyde authored ADR-001/002/003.
- ADR-002 Accepted; ADR-003 Proposed (docs/startup-grind/05-decisions/ADR-003-PROPOSED-MODULAR-MONOLITH-BACKEND.md:3).
- PLAN.md:58-63 open: pickup window, shop tie-break, ₱7 per order vs per bag, ₱40 flat vs tiered, cash reconciliation.
- BUSINESS_RULES_PROPOSED.md:148-160: 10 open approvals incl. multi-shop zone selection and cash ownership.
- Memory index only (not repo): Notion docs PAUSED; no Notion writes.

## Q. Conflicts to surface
1. Express weight ceiling: docs/spec.md:99 "≤5 kg"; DESIGN.md:219 "≤6 kg"; code default 6 (platform-config.service.ts:115); site.ts:122 "6 kg or below".
2. Express vehicle: spec/PLAN "motorcycle"; site.ts:123-126 + DESIGN.md:219 "e-bike"; alpha:575 "Flutter" app (superseded).
3. Delivery fee: spec/PLAN ₱40/₱65–80 tiers vs code single distance formula base ₱40 + ₱8/km, cap ₱150.
4. Service fee ₱13 (alpha) vs ₱7 (spec, code, Money-Flow).
5. Table 4 delivery 40 vs 35 (see F).
6. Survey: "119 shops surveyed" (alpha:840) vs "field price survey recommended" (alpha:1008).
7. "Send ₱X for approval" (DESIGN.md:295, plans:91) vs "Confirm ₱X" (decision plans:14; code weigh.ts:81-84).
8. Payment timing: PLAN §10.2 pay-after-weigh-in vs COD at launch (PLAN §10.4, pilot D2).
9. Shop count: 119 walk-ins vs 0 partner shops signed.
10. Customer chooses shop: auto-match + "Change laundry" (auto-match plan:38-50) vs PLAN §7 "shop tie-break" open.
