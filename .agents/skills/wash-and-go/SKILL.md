---
name: wash-and-go
description: Work on Wash & Go, the car-wash startup repo (frontend, landing-page, PLAN.md, ADRs, Notion mirror). Use for any code or doc change in this repo.
---

# Wash & Go

- Read `AGENTS.md` first. It is a contract: pre-code gate, rules, verification, post-code docs.
- Source of truth order: accepted ADRs in `docs/startup-grind/05-decisions/`, locked `PLAN.md`, `docs/spec.md`.
- Canonical checkout is this folder. The older `Wash&Go` folder and `ClydeQue/Wash-Go` are legacy. Do not work there.
- Verify in the package you changed (`frontend/` or `landing-page/`): `npm run format`, `lint`, `type-check`, `test`, `build`.
- A missing command is a gap. Record it. Do not claim a pass that did not run.
- Browsing uses gstack `/browse` per `CLAUDE.md`, not the Chrome MCP tools.
