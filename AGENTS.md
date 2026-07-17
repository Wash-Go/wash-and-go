# Wash & Go AI Engineering Contract

## Scope

These instructions apply to the entire `Wash-Go/wash-and-go` repository.
Humans and AI agents must follow them before changing code or documentation.

## Source of truth

- The canonical repository is `https://github.com/Wash-Go/wash-and-go.git`.
- The local canonical checkout is
  `/Users/clyde/development/ClydeOS/projects/startups/wash-and-go`.
- `/Users/clyde/development/ClydeOS/projects/startups/Wash&Go` and
  `ClydeQue/Wash-Go` are legacy references. Do not implement new work there.
- The repository is authoritative for executable code and versioned technical
  decisions. Notion is the team-facing mirror and collaboration log.

When documents disagree, use this order:

1. Accepted ADRs in `docs/startup-grind/05-decisions/`.
2. Locked decisions in `PLAN.md`.
3. Product requirements in `docs/spec.md`.
4. Current application README files.
5. Notion summaries and discussion notes.

Proposed ADRs and proposal documents are informative only. They do not override
an accepted ADR or create a mandatory implementation rule until their status is
explicitly changed to Accepted.

Do not silently resolve a conflict. Record it in the task plan and create or
update an ADR when the decision changes architecture or business behavior.

## Required pre-code gate

Before editing, the agent must read:

- This file.
- The nearest application README.
- Relevant requirements, plans, and ADRs.
- The affected implementation and tests.
- The relevant Notion page or Code Update when a Notion MCP is available.

Then provide a preflight brief containing:

1. Problem statement.
2. Evidence from the current code.
3. In scope and out of scope.
4. Acceptance criteria.
5. Architecture and data-flow impact.
6. Risks, security concerns, and rollback plan.
7. Implementation plan.
8. Verification plan.
9. Concepts the contributor should learn from the change.

Use `.ai/prompts/START_TASK.md` as the copy-and-paste task starter.

## Implementation rules

- Prefer the smallest coherent change that satisfies all acceptance criteria.
- Do not replace a requested outcome with a partial mock or compatibility shim.
- Keep permanent business state in PostgreSQL. Queues and caches are not the
  source of truth.
- Keep pricing, payments, dispatch, authorization, and commission rules in the
  backend. Clients remain presentation and interaction layers.
- Treat `landing-page/` as the public onboarding website only. Do not add
  booking, payment, dispatch, tracking, shop operations, or admin operations to
  the public web product.
- Build customer and rider experiences with React Native, Expo development
  builds, Expo Router, and TypeScript. Keep shared domain/API code in packages;
  do not share role-specific screens between apps merely to reduce file count.
- Access TomTom Search, geocoding, routing, matrix, and optimization services
  through backend adapters. Never place a privileged TomTom key in client code.
- Keep map rendering behind a mobile maps package. Validate MapLibre plus
  TomTom tiles, attribution, licensing, and device performance in a proof of
  concept before locking the renderer.
- Use decimal-safe money types. Never use binary floating-point values for
  persisted PHP amounts.
- Never commit secrets, `.env` files, credentials, production customer data, or
  private keys.
- Validate external inputs and enforce authorization on the server.
- Make background jobs idempotent because delivery can occur more than once.
- Do not claim a test, build, migration, or deployment succeeded unless it ran.
- Preserve unrelated user changes and document inherited failures separately.

## Required verification

Run checks appropriate to the changed surface. For a TypeScript application,
the default gate is:

```bash
npm run format
npm run lint
npm run type-check
npm run test
npm run build
```

If a command is missing or no tests exist, record that as a gap. Do not hide it
by reporting the check as successful.

## Required post-code documentation

Every completed change must create or update:

1. A versioned Markdown record in
   `docs/startup-grind/04-code-updates/YYYY-MM-DD-short-slug.md`.
2. The matching Notion Code Updates database item when MCP access is available.

Use the stable Update ID format:

```text
WAG-YYYYMMDD-short-slug
```

Before creating a Notion record, search for the Update ID. Update the existing
record when found; create one only when it does not exist.

Every update must state:

- What changed and why.
- User and business impact.
- Files and systems affected.
- Architecture or data-flow changes.
- Important implementation details.
- Alternatives considered and tradeoffs.
- Security, privacy, and operational impact.
- Commands run and their exact outcomes.
- Known limitations and follow-up work.
- A plain-language concept explanation for learning.
- Pull request or commit link when available.

Use `.ai/prompts/COMPLETE_TASK.md` and
`docs/startup-grind/templates/CODE_UPDATE_TEMPLATE.md`.

## AI response style

- Explain evidence before conclusions.
- Lead with outcomes and required actions.
- Define unfamiliar terms when first used.
- Show why the code works, not only what to paste.
- Separate confirmed facts, assumptions, and proposals.
- Be concise in status updates and detailed in engineering records.
- Never describe unverified work as complete.

## Notion MCP contract

When a Notion connector is available:

1. Fetch the Wash & Go Engineering Hub and relevant child pages.
2. Search the Code Updates data source for the stable Update ID.
3. Create or update the record after verification.
4. Include the local Markdown record path and GitHub link.
5. Return the resulting Notion page URL in the final report.

When Notion is unavailable, finish the local Markdown record and mark
`notion_sync: pending`. A later agent must sync pending records without
duplicating Update IDs.
