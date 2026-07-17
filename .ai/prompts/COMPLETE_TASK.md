# Wash & Go post-code prompt

Use this after implementation and verification.

```text
Document this completed Wash & Go engineering change.

Stable Update ID: <WAG-YYYYMMDD-short-slug>
Title: <concise outcome>
Repository: https://github.com/Wash-Go/wash-and-go
Branch or pull request: <branch, PR URL, or not created>

First inspect the actual git diff and verification output. Do not rely on memory.

Create or update the local Markdown record under:
docs/startup-grind/04-code-updates/YYYY-MM-DD-short-slug.md

The record must contain:
- executive summary;
- problem and evidence;
- scope and non-scope;
- implementation details by layer;
- files changed;
- architecture and data-flow impact;
- user and business impact;
- alternatives considered and tradeoffs;
- security, privacy, migration, and rollback notes;
- verification commands with pass, fail, or not-run status;
- known limitations and follow-ups;
- concept learning section explaining how and why the solution works.

If a Notion MCP is connected:
1. Fetch the Wash & Go Engineering Hub.
2. Search the Code Updates data source for the Stable Update ID.
3. Update the existing item if found. Otherwise create one.
4. Copy the engineering record into the page using the database's exact property schema.
5. Set the correct status and date. Never mark verified checks that did not run.
6. Return the Notion page URL.

If Notion is unavailable, set notion_sync: pending in the Markdown record and do not claim it was published.
```
