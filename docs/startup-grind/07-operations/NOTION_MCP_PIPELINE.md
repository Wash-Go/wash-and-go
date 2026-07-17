# Notion MCP documentation pipeline

## Objective

Every meaningful code change should leave an evidence-based record in Git and
Notion without depending on a contributor to remember an informal format.

## System of record

- Git Markdown is the durable, reviewable technical record.
- Notion is the shared discovery and collaboration layer.
- Stable Update IDs connect both systems and prevent duplicates.

## Pipeline

```mermaid
flowchart LR
  Prompt[Pre-code prompt] --> Context[Read repo and Notion context]
  Context --> Plan[Preflight and acceptance criteria]
  Plan --> Code[Implement]
  Code --> Verify[Run verification]
  Verify --> Markdown[Write Git code-update record]
  Markdown --> Search[Search Notion by Update ID]
  Search --> Upsert[Create or update Notion record]
  Upsert --> Review[Human review and PR]
```

## Before coding

The contributor sends `.ai/prompts/START_TASK.md` with task-specific values.
The AI must read `AGENTS.md`, code, tests, plans, ADRs, and relevant Notion
context before editing.

## After coding

The AI uses `.ai/prompts/COMPLETE_TASK.md`, inspects the current diff and test
output, and writes the Markdown record.

With a Notion MCP, the AI must:

1. Fetch the Wash & Go Engineering Hub.
2. Fetch the Code Updates database schema.
3. Search for the stable Update ID.
4. Update the matching page or create a new one.
5. Use the exact database property names and allowed values.
6. Return the page URL as evidence of publication.

## Proposed Code Updates properties

| Property     | Type      | Purpose                                                           |
| ------------ | --------- | ----------------------------------------------------------------- |
| Update       | Title     | Human-readable outcome                                            |
| Update ID    | Rich text | Stable idempotency key                                            |
| Status       | Status    | Planned, In Progress, Verified with Gaps, Complete, Blocked       |
| Date         | Date      | Change date                                                       |
| Area         | Select    | Frontend, Landing, Backend, Mobile, Infrastructure, Documentation |
| Change Type  | Select    | Feature, Fix, Refactor, Migration, Documentation, Decision        |
| Verification | Select    | Passed, Passed with Warnings, Failed, Not Run                     |
| Repository   | URL       | Canonical GitHub repository                                       |
| Pull Request | URL       | Review and merge evidence                                         |
| Owner        | People    | Responsible contributor                                           |
| Risk         | Select    | Low, Medium, High                                                 |
| Local Record | Rich text | Repository-relative Markdown path                                 |

## Idempotency

An AI must never create a page before searching the `Update ID`. Repeated runs
update the same record. This makes retries safe and prevents documentation spam.

## Failure handling

- If Notion is unavailable, mark the Markdown record `notion_sync: pending`.
- If verification fails, publish the failure honestly and set the matching
  status. Do not hide it.
- If the Notion schema changes, fetch it again rather than guessing property
  names.
- If a record contains secrets, stop and redact before publishing.

## Human control

Automation records engineering work. It does not approve architecture, merge
pull requests, deploy production, or change business rules without the normal
human decision process.
