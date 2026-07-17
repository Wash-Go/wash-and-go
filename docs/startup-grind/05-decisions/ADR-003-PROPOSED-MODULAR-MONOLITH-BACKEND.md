# ADR-003: Modular monolith backend boundaries

- Status: **Proposed**
- Date: 2026-07-17
- Scope: backend organization, data-access boundary, UI API style, and optional
  self-hosted edge proxy

## Context

Wash & Go has connected business rules across orders, dispatch, pricing,
payments, partner shops, credits, and remittance. The startup needs clear code
ownership without the deployment and data-consistency cost of premature
microservices.

The existing plan contains a NestJS module map and REST contract sketch, but it
does not yet make repository boundaries, cross-domain access, GraphQL, or Nginx
status explicit.

## Proposed decision

1. Organize the NestJS backend as a modular monolith with business-domain
   modules in one codebase and coordinated release.
2. Use the dependency direction controller/worker → service → repository or
   provider adapter.
3. Permit only repositories to access Prisma for domain persistence. Services
   must not inject `PrismaService`.
4. Prevent cross-domain repository access. Modules collaborate through public
   application services/facades or durable events.
5. Use REST plus OpenAPI-generated TypeScript clients for UI applications at
   MVP. Keep provider webhooks as REST. Treat GraphQL as a revisit option.
6. Use Nginx only when self-hosting requires a team-managed reverse proxy. It is
   not an application dependency or default requirement.

## Rationale

- A modular monolith fits a small team and keeps transactions and operations
  simpler than microservices.
- Wash & Go's money and order-state rules justify a clear separation between
  business decisions and persistence queries.
- REST/OpenAPI matches the known mobile workflows and existing typed-client
  plan without adding an unproven second API paradigm.
- Conditional Nginx avoids duplicating features already supplied by managed
  hosting while keeping a valid self-hosting path.

## Alternatives considered

### Microservices

Not proposed. Independent services would add network failure modes, distributed
transactions, additional deployments, observability burden, and unclear data
ownership before the team has proven independent scaling needs.

### One unstructured NestJS application

Not proposed. It is faster for the first few endpoints but makes pricing,
payments, dispatch, and order-state code easier to mix accidentally.

### Direct Prisma access from services

Simpler for basic CRUD, but not proposed for core domains because it couples
business rules to persistence and makes cross-domain access difficult to audit.
A review may permit a narrowly documented exception for a simple read model.

### GraphQL for every UI

Not proposed for MVP. It becomes valuable when clients demonstrably need
different nested data shapes or REST is measurably chatty. It also requires
query limits, cache policy, schema governance, and N+1 protection.

### Always deploy Nginx

Not proposed. Vercel, managed application platforms, and cloud load balancers
may already provide TLS and proxy behavior. Caddy is also a simpler self-hosted
alternative when automatic HTTPS is the main need.

## Consequences if accepted

### Positive

- Business domains have understandable owners.
- Database access and cross-domain dependencies become reviewable.
- API and worker entry points reuse the same business services.
- The system can later extract a domain without starting as distributed
  infrastructure.

### Negative

- Repositories add files and dependency wiring.
- Poorly chosen module boundaries can still create circular dependencies.
- Multi-domain transactions need an explicit transaction-context design.
- REST endpoints may need additional composition endpoints as screens evolve.

### Mitigation

- Start with broad domains and split only when evidence appears.
- Build one representative order vertical slice before accepting the ADR.
- Allow simple concrete repositories instead of mandatory interface pairs.
- Record cross-module dependencies and transaction ownership during review.

## Revisit triggers

- A domain needs independent scaling or releases for sustained operational
  reasons.
- Team ownership grows enough that a domain can be independently supported.
- REST produces measured client chattiness across multiple applications.
- The chosen hosting provider makes Nginx unnecessary or requires a different
  ingress component.

## Status rule

Nothing in this ADR is mandatory while its status is **Proposed**. Acceptance
requires a separate review and an explicit status change in Git and Notion.
