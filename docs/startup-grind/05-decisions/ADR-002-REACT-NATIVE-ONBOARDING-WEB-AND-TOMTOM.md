# ADR-002: React Native mobile, onboarding-only web, and TomTom

- Status: Accepted
- Date: 2026-07-17
- Supersedes: the mobile, public-web, admin-surface, and maps decisions in the
  earlier `PLAN.md` revision; clarifies ADR-001

## Context

The inherited plan selected Flutter, Google Maps, and a Next.js shop/admin
dashboard. The startup has now chosen React Native for mobile, wants the public
website limited to onboarding, and wants TomTom for maps. The architecture must
still support distinct customer, rider, shop, and administrator responsibilities
without turning the public site into an operational dashboard.

## Decision

1. Build two TypeScript mobile apps: `apps/customer-mobile/` and
   `apps/rider-mobile/`, using React Native, Expo development builds, and Expo
   Router. Share API contracts, domain types, design tokens, and maps adapters;
   keep role-specific screens and permissions in their respective apps.
2. Make `landing-page/` the canonical public website. Its scope is discovery,
   coverage checking, onboarding/application intake, consent, and app-download
   handoff. It does not own booking, payment, tracking, dispatch, or operations.
3. Keep `frontend/` as an archived reference prototype. It is not deployed.
4. If shop/admin operations require a browser tool, create a separate private
   `apps/ops-console/` deployable later. It must not share the public site's
   hostname, routes, analytics boundary, or unauthenticated deployment.
5. Put TomTom behind a backend `MapsProvider` boundary. Search, geocoding,
   reverse geocoding, routing, matrix, and optimization calls are server-side.
   Mobile map display uses a separate restricted display key and a renderer
   selected after a MapLibre + TomTom proof of concept.
6. Do not use a WebView map as the production architecture. For MVP navigation,
   show the route in-app and deep-link to the device's navigation application.
   Evaluate a native TomTom Navigation SDK bridge only if embedded turn-by-turn
   navigation becomes a validated business requirement.

## Why this approach

- TypeScript is shared across the backend, generated API client, website, and
  mobile packages, reducing context switching for a small team.
- Expo development builds support production native modules while retaining
  Expo's build and update workflow.
- Separate customer and rider binaries keep permissions, release cadence,
  analytics, and app-store messaging understandable.
- A backend maps boundary protects expensive credentials and makes caching,
  quotas, request deduplication, and provider replacement possible.
- Separating public onboarding from private operations shrinks the public
  attack surface and keeps the user journey focused.

## Consequences

- A short native toolchain and development-build learning period is required.
- The team must validate TomTom coverage in Zamboanga using real addresses and
  routes before relying on it operationally.
- MapLibre is a candidate renderer, not yet a locked dependency. Attribution,
  tile compatibility, performance, and TomTom terms are proof-of-concept gates.
- Two mobile apps create two store listings but may share most non-UI packages.
- A private operations console is deferred, not eliminated; startup staff need
  an explicit manual or minimal-tool process until it exists.

## Alternatives considered

- One role-switched mobile binary: faster initially, rejected because customer
  and rider permissions, workflows, distribution, and release risk differ.
- Flutter: capable, rejected because the accepted team direction is React
  Native and TypeScript reuse has meaningful value for this team.
- Operational features on the public Next.js site: rejected because it violates
  the onboarding-only boundary and expands security and product scope.
- Direct TomTom calls for all client functions: rejected because privileged
  keys, cost controls, caching, and provider policy belong on the backend.
- TomTom Web SDK inside a React Native WebView: rejected for production because
  it adds a web/native bridge and is weaker for native gestures and lifecycle.

## Revisit triggers

- Real-device proof of concept cannot meet map performance or attribution needs.
- Zamboanga address/route tests fail the agreed acceptance threshold.
- Rider research proves embedded, offline turn-by-turn navigation is essential.
- Shop volume makes manual operations unsafe or materially slows fulfillment.
