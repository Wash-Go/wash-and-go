# ADR-001: Canonical repository and web surfaces

- Status: Accepted
- Date: 2026-07-17

## Context

Wash & Go had a legacy repository under `ClydeQue/Wash-Go` and a newer DOST
organization repository under `Wash-Go/wash-and-go`. The repositories contained
different frontend work and could diverge further.

## Decision

`Wash-Go/wash-and-go` is the sole source of truth. The legacy frontend is
preserved under `frontend/`. The newer Next.js marketing site remains under
`landing-page/`.

The migrated TanStack application is classified as an incomplete customer-web
prototype. ADR-002 supersedes its earlier platform assumptions and classifies
it as an archived reference rather than a deployable product surface.

## Consequences

- All new code and decisions go to the DOST repository.
- The legacy repository remains available for recovery but receives no new work.
- The repository temporarily contains two web runtimes.
- Shared assets must be extracted deliberately instead of copied ad hoc.
- The team must decide which prototype flows migrate to React Native or the
  onboarding website.

## Alternatives considered

- Delete the legacy frontend: rejected because unfinished work would be lost.
- Replace the DOST landing page: rejected because it is newer, independent work.
- Continue both repositories: rejected because it creates conflicting truth and
  duplicated maintenance.
