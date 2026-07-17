# Proposed backend architecture

- Status: **Proposed**
- Date: 2026-07-17
- Decision record: `ADR-003-PROPOSED-MODULAR-MONOLITH-BACKEND.md`

This document is a design for team review. It is not an implementation rule
until ADR-003 is accepted.

## Simple explanation

Wash & Go would have one backend application divided into clearly owned
business sections. Orders, payments, dispatch, shops, and other areas stay in
the same application but do not mix their internal files or database access.

Think of it as one building with separate departments, not separate companies:

- one codebase;
- one PostgreSQL database;
- one coordinated release;
- clear rules about which department owns each responsibility.

This is called a **modular monolith**. It keeps startup operations simple while
making a future split possible if real scale or team ownership requires it.

## Proposed module boundaries

Start with a small number of business domains, not a module for every table or
endpoint:

- identity and users;
- zones and partner shops;
- scheduling and orders;
- dispatch, fleet, and routing;
- pricing, payments, credits, and remittance;
- QR handoffs, notifications, and realtime updates.

The exact boundaries should be confirmed while implementing the first complete
order flow.

## Proposed folder shape

```text
backend/src/
  common/                 # technical helpers only
  prisma/                 # PrismaService infrastructure
  jobs/                   # thin BullMQ processors
  modules/
    orders/
      domain/             # order states, rules, events, value objects
      dto/                # validated API inputs and outputs
      repositories/       # order persistence queries
      services/           # order use cases and business decisions
      controllers/        # thin API entry points
      orders.module.ts
    payments/
    dispatch/
    shops/
    ...
```

A flatter module is acceptable during the MVP when a domain is still small.
The important rule is ownership, not the number of folders.

## Proposed dependency rule

```text
Controller or worker
        ↓
Application service
        ↓
Repository or integration port
        ↓
Prisma or external provider adapter
```

### Controller or resolver

- Handles the transport request and validated input.
- Applies authentication guards.
- Calls a service.
- Contains no database, pricing, dispatch, or state-transition logic.

### Service

- Owns use cases and business decisions.
- Calls repositories and provider adapters.
- Does not import or inject `PrismaService`.
- Enforces ownership and business authorization so another entry point cannot
  bypass the rule.

### Repository

- Owns database queries for its domain.
- May inject `PrismaService`.
- Contains no HTTP, GraphQL, pricing, or workflow decisions.
- Is not exported for unrelated domains to use directly.

Concrete repository classes are enough initially. An interface and separate
implementation are added only when substitution, transaction design, or tests
need that extra boundary.

### Provider adapter

TomTom, PayMongo, Firebase, SMS, email, and push notification SDK details stay
inside adapters. Services request a business capability such as “calculate a
route” or “create a payment,” not a vendor-specific JSON response.

### Worker

A BullMQ processor is another thin entry point. It calls the same application
services as an API controller. It does not query Prisma directly.

Running the API and worker as separate processes does not make the system a
microservice architecture; they still share one codebase, domain model,
database, and coordinated release.

## Proposed cross-domain rules

- A domain exports a service or explicit facade, never its repository.
- Business code must not be placed in `common/` merely because two modules need
  it. Give the rule an owner.
- Required operations call another module synchronously through its public
  service.
- Notifications and other non-critical follow-up work use durable outbox/events.
- A multi-domain database transaction uses an explicit transaction or
  unit-of-work abstraction; services do not solve it by importing Prisma.

## Proposed API direction

Use REST plus generated OpenAPI TypeScript clients for the React Native apps,
public onboarding website, and any later private operations console.

Why this is proposed for the MVP:

- the initial screens and operations are known;
- requests and errors are straightforward to inspect;
- the same generated TypeScript client can serve mobile and web;
- Socket.io already covers realtime updates;
- it avoids GraphQL query complexity, cache policy, and N+1 protection before
  those solve an observed problem.

Keep payment and provider webhooks as REST regardless of the UI API choice.

GraphQL remains an alternative. Reconsider it when several clients repeatedly
need different nested data shapes or REST causes measured network chattiness.
If adopted later, resolvers must call the same services and never access
repositories directly.

## Proposed Nginx boundary

Nginx is optional deployment infrastructure, not part of a domain module.

Use it only when the API is self-hosted on a VPS and the team needs TLS
termination, reverse-proxy routing, WebSocket forwarding, request-size limits,
or load balancing. Do not add it when the chosen hosting platform already
provides those capabilities.

```text
Internet
  ↓
Cloudflare or managed edge
  ↓
Nginx, only for self-hosting
  ↓
NestJS API

Internal only: BullMQ worker, PostgreSQL, Redis
```

Nginx never replaces NestJS authentication, authorization, validation, or rate
limits. Workers, PostgreSQL, and Redis must not be publicly exposed through it.

## Not proposed

- microservices;
- a database per domain;
- GraphQL subscriptions in addition to Socket.io;
- repository interface/implementation pairs for every trivial query;
- a NestJS module for every endpoint or database table;
- Nginx as a requirement before hosting is selected.

## Review questions before acceptance

1. Are the first domain boundaries understandable to the whole engineering
   team?
2. Is the repository rule worth its boilerplate for simple read-only modules?
3. How will multi-domain Prisma transactions be represented?
4. Does REST/OpenAPI meet the first customer and rider screen contracts?
5. Which hosting choice, if any, requires team-managed Nginx?

## Acceptance process

The proposal becomes mandatory only after:

1. the team answers the review questions;
2. one representative vertical slice is designed or spiked;
3. ADR-003 changes from **Proposed** to **Accepted**;
4. `AGENTS.md` and implementation templates are updated in the accepting change.
