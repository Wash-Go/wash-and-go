---
update_id: WAG-20261029-clydeos-project-context
notion_sync: pending
---

# Shared agent context

- Problem: Claude and Codex loaded different project instructions.
- Change: `AGENTS.md` now includes the existing gstack browser rules.
    - `CLAUDE.md` imports that single source.
    - ClydeOS links point to the shared router and project pointer.
- Impact: either tool receives the same engineering contract.
    - Application behavior is unchanged.
    - Source remains in the Wash & Go repository.
- Decision: preserve project rules instead of replacing them with a generic template.
    - Keep personal workspace links optional for standalone clones.
- Scope: instruction files and this update record.
    - No data flow or integration changed.
    - No deployment was requested.
- Verification: application checks were skipped for this documentation-only change.
    - ClydeOS context coverage is checked separately.
- Follow-up: sync this record to Notion when its connector is available.
    - Update ID: `WAG-20261029-clydeos-project-context`.
