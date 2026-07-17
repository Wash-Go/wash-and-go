---
update_id: WAG-20260717-react-native-onboarding-tomtom
title: Lock React Native mobile, onboarding-only web, and TomTom architecture
date: 2026-07-17
status: verified-docs
notion_sync: https://app.notion.com/p/3a076e8ead9081b9bfe6fe5934352d33
repository: Wash-Go/wash-and-go
branch: main
pull_request:
---

# Lock React Native mobile, onboarding-only web, and TomTom architecture

## Executive summary

The platform plan now selects two React Native/Expo mobile apps, limits the
public Next.js website to onboarding, and integrates TomTom through backend
provider adapters. The migrated TanStack customer-web prototype is an archived
reference. A future shop/admin console is private, separate, and conditional on
evidence from pilot operations.

## Problem and evidence

The repository's central documents still selected Flutter, Google Maps, and a
publicly deployed Next.js shop/admin dashboard. Those assumptions contradicted
the founder's accepted direction and appeared in `PLAN.md`, `docs/spec.md`, the
root/application READMEs, architecture pages, and ADR-001.

TomTom also has several distinct products—display, search, reverse geocoding,
routing, matrix, and waypoint optimization—with different security, cost, and
runtime concerns. Treating “maps” as one direct client call would expose keys,
repeat costly work, and couple domain logic to a vendor response format.

## Scope

### In scope

- Accept React Native, Expo development builds, Expo Router, and TypeScript.
- Define separate customer and rider apps with focused shared packages.
- Limit `landing-page/` to public onboarding and app handoff.
- Archive `frontend/` as reference-only.
- Define the separate, deferred private-operations boundary.
- Define TomTom server/client key boundaries, address flow, route flow, cache
  rules, proof gates, and delivery phases.
- Synchronize the accepted direction into repository and Notion documentation.

### Out of scope

- Scaffolding the Expo apps or NestJS backend.
- Implementing live TomTom requests or purchasing a plan.
- Building the private operations console.
- Selecting raster versus vector display before a real-device spike.
- Claiming embedded turn-by-turn navigation for MVP.

## Acceptance criteria

- [x] `PLAN.md` has no active Flutter or Google Maps architecture dependency.
- [x] Public website responsibilities are explicitly onboarding-only.
- [x] Customer and rider React Native apps have named repository locations.
- [x] Privileged TomTom APIs are server-side behind `MapsProvider`.
- [x] Map renderer and Zamboanga coverage have measurable proof gates.
- [x] A new accepted ADR records the decision and consequences.
- [x] Notion architecture, product, platform-plan, and update record are synced.

## Implementation

- `PLAN.md` revises locked choices, phases, testing, distribution, generated
  clients, work lanes, and maps dependencies.
- `docs/spec.md` distinguishes the source application proposal from the accepted
  architecture.
- `docs/startup-grind/05-decisions/ADR-002-...md` is the authority for the
  platform revision.
- `docs/startup-grind/02-architecture/MOBILE_WEB_MAPS_PLAN.md` provides the
  phased plan, data flows, security controls, proof gates, and primary sources.
- Root and application READMEs prevent the archived frontend or public website
  from silently growing into a second product architecture.
- `AGENTS.md` turns these boundaries into contributor rules.

## Architecture and data flow

Mobile and web send address/search/route intents to NestJS. The backend applies
authorization, rate limits, Zamboanga bias and service-zone validation, then a
TomTom adapter translates provider JSON into domain types. Stable geocodes and
route plans are cached; operationally relevant route decisions are stored in
PostgreSQL with request hashes and provider metadata. Mobile map rendering uses
a separate restricted display key only after the real-device proof succeeds.

## Alternatives and tradeoffs

- A single role-switched app would reduce initial project count but mixes
  permissions, store audiences, analytics, and release risk.
- A public shop/admin dashboard would be convenient but violates the website's
  onboarding-only role and increases attack surface.
- Direct client calls are simpler for a demo but weaken credential, quota,
  normalization, caching, and provider-replacement controls.
- A WebView can embed a web map but creates a weaker native lifecycle and gesture
  boundary. It remains a prototype technique, not the production decision.
- MapLibre is deliberately conditional: the team gains a native RN renderer
  option without pretending tile/style compatibility is proven before testing.

## Security, privacy, and operations

- Search, geocoding, routing, matrix, and optimization credentials stay on the
  server. Display keys are separate by platform/environment and restricted.
- Public onboarding endpoints require rate limits, validation, explicit consent,
  and no automatic privileged-role activation.
- Rider location is personal operational data. Collection frequency, retention,
  access, and customer visibility require explicit policies before launch.
- Route usage has observability events and usage alerts; optimization never runs
  from a live-location or render loop.
- This is documentation-only and has no database migration or runtime rollback.
  Revert ADR-002 and its linked plan changes only through a superseding ADR.

## Verification

| Command                       | Status  | Evidence                                                                  |
| ----------------------------- | ------- | ------------------------------------------------------------------------- |
| `rg` conflict audit           | Passed  | No active Flutter, Google Maps, or public-dashboard dependency remains    |
| Markdown structure/link audit | Passed  | Required local decision, plan, and update files exist and are non-empty   |
| Prettier Markdown check       | Passed  | Every changed Markdown file in the verification set matches project style |
| `git diff --check`            | Passed  | No whitespace or patch-integrity errors                                   |
| Runtime tests                 | Not run | Documentation-only change; no product implementation changed              |

## Known limitations and follow-ups

- Assemble and score the Zamboanga address/route test set.
- Run the MapLibre/TomTom spike on real Android and iOS devices.
- Define the exact private-operations build trigger and pilot manual procedure.
- Confirm the current TomTom commercial terms and forecast usage before launch.
- Convert the phased plan into implementation issues only after the proof gate.

## Concept learning

A provider adapter is a translation boundary. The business asks for an
`AddressCandidate` or `RoutePlan`; only the adapter knows TomTom's URLs, query
parameters, and response JSON. This works because the rest of the system depends
on a small interface rather than a vendor. A common failure mode is leaking a
provider-specific ID or response object through every feature, which makes
caching, testing, and replacement difficult. Debug from the boundary inward:
log a redacted request ID and normalized result, compare it with the provider
response, then test the adapter with saved fixtures.
