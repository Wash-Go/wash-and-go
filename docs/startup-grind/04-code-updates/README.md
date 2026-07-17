# Code updates

This folder is an append-only technical history of meaningful implementation
work. It is the repository source for the Notion Code Updates database.

## Naming

```text
YYYY-MM-DD-short-slug.md
```

Stable Update ID:

```text
WAG-YYYYMMDD-short-slug
```

## Rules

- Search the Notion database by Update ID before creating a page.
- One record describes one coherent engineering outcome.
- Include exact verification commands and statuses.
- Distinguish inherited issues from regressions introduced by the change.
- Explain at least one reusable technical concept.
- Never include secrets, access tokens, or production personal information.

Use [`../templates/CODE_UPDATE_TEMPLATE.md`](../templates/CODE_UPDATE_TEMPLATE.md).
