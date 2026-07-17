---
update_id: WAG-20260717-proposed-backend-docs
title: Document proposed backend boundaries and business rules
date: 2026-07-17
status: proposed
notion_sync: https://app.notion.com/p/3a076e8ead90815d81a6f229465e2da7
repository: Wash-Go/wash-and-go
branch: main
pull_request:
---

# Document proposed backend boundaries and business rules

## Executive summary

The documentation now explains the proposed modular-monolith backend in simple
terms, records its tradeoffs in ADR-003, covers conditional Nginx use, and puts
non-technical business rules in a separate file. Every new architectural rule
is marked **Proposed** and does not override accepted ADR-001 or ADR-002.

## Problem and evidence

The existing system overview named NestJS, PostgreSQL, Redis, and workers but
did not explain internal module ownership. `PLAN.md` had a module map and REST
contract without an explicit proposal status. The Notion stack summary also
listed “NestJS modular monolith” under accepted direction even though no
accepted ADR governed that pattern.

Business rules such as fees, commission, order stages, recurring schedules,
credits, handoffs, and rider-location handling were mixed into long technical
documents, making founder and operations review difficult.

## Scope

### In scope

- Proposed modular-monolith module boundaries.
- Proposed controller/worker → service → repository/adapter dependency rule.
- Proposed cross-domain access and Prisma ownership rules.
- REST/OpenAPI recommendation with GraphQL retained as an alternative.
- Conditional Nginx guidance for self-hosted deployment.
- A plain-language proposed business-rules guide.
- Clean architecture and ADR indexes with visible statuses.
- Matching Notion pages and Code Updates record.

### Out of scope

- Accepting ADR-003.
- Scaffolding NestJS modules or repositories.
- Selecting production hosting or installing Nginx.
- Changing an executable API from REST to GraphQL or vice versa.
- Final approval of rates, commissions, schedules, credits, or privacy policy.
- Changing accepted ADR-001 or ADR-002.

## Acceptance criteria

- [x] ADR-003 status is Proposed.
- [x] The backend proposal says it is non-mandatory until acceptance.
- [x] Nginx is optional and hosting-dependent.
- [x] GraphQL is an alternative, not an adopted API paradigm.
- [x] Business rules have a separate non-technical file with Proposed status.
- [x] Architecture and decision indexes distinguish Proposed, Accepted, and
      Implemented.
- [x] Notion mirrors the proposal and corrects the accepted-status wording.
- [x] Final formatting, link, and conflict checks pass.

## Implementation

- Added `BACKEND_MODULAR_MONOLITH_PROPOSAL.md` as the readable technical design.
- Added `ADR-003-PROPOSED-MODULAR-MONOLITH-BACKEND.md` for context, alternatives,
  consequences, and acceptance requirements.
- Added `BUSINESS_RULES_PROPOSED.md` for founders and operations.
- Added an architecture index and expanded the ADR index with status meanings.
- Updated the system overview, specification, plan, root documentation links,
  and contributor source-of-truth rule.

## Architecture and data flow

No runtime data flow changed. The proposal describes a future dependency flow:
controllers and workers call services; services make business decisions and
call repositories/provider adapters; repositories alone access Prisma for
domain persistence. The API and worker may be separate processes while
remaining one modular monolith.

## Alternatives and tradeoffs

- Microservices were documented as premature because they add network,
  deployment, data-ownership, and transaction complexity.
- Direct Prisma access from every service is simpler for CRUD but makes the
  money and order domains harder to audit.
- GraphQL may help clients request different nested shapes but adds schema,
  query-cost, cache, and N+1 responsibilities before a measured need exists.
- Always-on Nginx was rejected as a proposal because managed platforms may
  already provide TLS, proxying, and load balancing. Caddy remains a simpler
  self-hosted alternative for automatic HTTPS.

## Security, privacy, and operations

- Nginx does not replace application authentication, authorization, validation,
  or rate limiting.
- PostgreSQL, Redis, and BullMQ workers remain private infrastructure.
- Business authorization belongs in services as well as transport guards.
- Provider credentials remain inside backend adapters.
- Rider location retention and visibility remain unapproved business rules.
- The change is documentation-only and has no migration or deployment impact.

## Verification

| Command                  | Status | Evidence                                                        |
| ------------------------ | ------ | --------------------------------------------------------------- |
| Proposed-status audit    | Passed | No accepted/locked modular-monolith, GraphQL, or Nginx wording  |
| Markdown link/file audit | Passed | New proposal, ADR, business guide, and indexes exist            |
| Prettier Markdown check  | Passed | Every document in the verification set matches project style    |
| `git diff --check`       | Passed | No whitespace or patch-integrity errors                         |
| Frontend verification    | Passed | Format, lint, type-check, one Vitest test, and production build |
| Landing verification     | Passed | Lint, type-check, and Next.js production build                  |

## Known limitations and follow-ups

- Review one representative order vertical slice before accepting ADR-003.
- Decide how multi-domain Prisma transactions pass transaction context.
- Validate whether simple read-only modules need the same repository ceremony.
- Confirm REST/OpenAPI against first customer and rider screen contracts.
- Select Nginx, Caddy, or managed ingress only after hosting is chosen.
- Assign business owners to approve each open rule in the plain-language guide.
- Upgrade local Node.js from 22.11.0 to at least 22.12.0 before relying on the
  migrated Vite development runtime; the build passed with an engine warning.

## Concept learning

An ADR status is a control, not decoration. **Proposed** means the team may
discuss or test the idea. **Accepted** makes it the intended direction.
**Implemented** requires evidence in working code. Confusing these states causes
developers to build unapproved patterns simply because they appeared in a plan
or diagram. Debug documentation conflicts by checking the ADR status first,
then the plan, specification, code, and mirrored Notion summary in that order.
