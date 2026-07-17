---
update_id: WAG-20260717-engineering-documentation-pipeline
title: Establish the AI engineering and Notion documentation pipeline
date: 2026-07-17
status: complete
notion_sync: https://app.notion.com/p/3a076e8ead90819d82c2f95851166423
repository: Wash-Go/wash-and-go
branch: main
---

# Establish the AI engineering and Notion documentation pipeline

## Executive summary

Wash & Go now has a repository-owned AI engineering contract, reusable pre-code
and post-code prompts, layered technical documentation, stable code-update
records, ADRs, and a connected Notion Engineering Hub with a structured Code
Updates database.

## Problem and evidence

The Start-up grind workspace contained business-plan, logistics, feature, and
stack pages but no unified engineering hub, no consistent code-update database,
and no required AI workflow connecting implementation evidence to Notion.

The repository contained a plan and specification but no `AGENTS.md`, no
source-of-truth rule, and no standard for explaining or verifying AI-generated
changes.

## Implemented system

### Repository

- Root `AGENTS.md` with authority, preflight, implementation, verification,
  learning, security, and Notion synchronization rules.
- `.ai/prompts/START_TASK.md` for the required prompt before coding.
- `.ai/prompts/COMPLETE_TASK.md` for evidence-based documentation after coding.
- `docs/startup-grind/` with product, architecture, engineering, code-update,
  decision, learning, operations, and template sections.
- Stable Update IDs in `WAG-YYYYMMDD-short-slug` format.
- Idempotent Notion behavior: search the Update ID before creating a record.

### Notion

- Wash & Go Engineering Hub under the existing `Technical Documentation` page.
- Product and MVP overview.
- System architecture.
- Development workflow.
- `AGENTS.md - AI Engineering Contract` mirror.
- Pre-code and post-code prompt pages.
- Notion MCP automation-pipeline page.
- Code Updates database with status, area, change type, verification, risk,
  repository, pull request, and local-record fields.

## Architecture and data flow

Git is authoritative for code and versioned technical decisions. Notion is the
team-facing discovery and collaboration layer. Each change has one stable
Update ID linking a Markdown record to a Notion database page.

```text
Task prompt -> repository and Notion context -> preflight -> implementation
-> verification -> Git Markdown record -> Notion upsert -> human review
```

## Alternatives and tradeoffs

- **Notion-only documentation:** rejected because it cannot be reviewed in the
  same diff as code and may drift from implementation.
- **Git-only documentation:** rejected because it is less discoverable for
  non-engineering teammates and weak for collaborative database views.
- **Create a Notion page on every run:** rejected because retries create
  duplicates. Stable Update IDs make the workflow idempotent.

## Security and operations

- Prompts explicitly forbid secrets, credentials, production personal data, and
  unverified completion claims.
- Notion sync is a documentation action, not permission to merge, deploy, or
  change business rules.
- If Notion is unavailable, the Markdown record is completed with
  `notion_sync: pending` and synchronized later.

## Verification

| Check                      | Status | Evidence                                                                                      |
| -------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| Notion workspace identity  | Passed | Connected workspace is `Start-up grind`                                                       |
| Existing context discovery | Passed | Existing Technical Documentation, business plan, logistics, features, and stack pages fetched |
| Engineering Hub creation   | Passed | Hub and eight child pages created beneath Technical Documentation                             |
| Code Updates database      | Passed | Data source created with stable Update ID and engineering metadata                            |
| Idempotent record behavior | Passed | Database searched by migration Update ID before record creation                               |
| Repository documentation   | Passed | Source-of-truth policy, workflow, ADR, prompts, and templates exist in Git working tree       |

## Known limitations and follow-ups

- Each teammate must connect and authorize their own Notion MCP.
- An AI does not automatically read a Notion page named `AGENTS.md`; the pre-code
  prompt explicitly instructs it to fetch the page and repository file.
- Pull-request enforcement and CI checks are not configured yet.
- A later automation can scan `notion_sync: pending` records and publish them.

## Concept learning

An **idempotent** automation produces the same final state when it runs more
than once. Searching a stable Update ID before creating a Notion page turns the
documentation step into an upsert: update when present, insert when missing.
This matters because MCP calls, network operations, and AI workflows may be
retried. Without an idempotency key, every retry can create duplicate records.
