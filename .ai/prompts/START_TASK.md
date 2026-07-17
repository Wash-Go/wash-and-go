# Wash & Go pre-code prompt

Copy this prompt into Codex, Claude, ChatGPT, or another coding agent before it
starts a Wash & Go task. Replace every value inside `<angle brackets>`.

```text
You are working on Wash & Go, a DOST AZUL Hub laundry marketplace.

Canonical repository: https://github.com/Wash-Go/wash-and-go
Task: <describe the requested outcome>
User or business reason: <why this matters>
Relevant surface: <landing-page | frontend | backend | mobile | infrastructure | documentation>
Known references: <issue, design, PLAN.md section, spec section, or Notion URL>
Constraints: <deadline, compatibility, security, budget, or non-goals>

Before you edit any file:
1. Read the repository AGENTS.md completely.
2. Inspect the current implementation, tests, nearest README, PLAN.md, relevant ADRs, and docs/spec.md.
3. If a Notion MCP is connected, fetch the Wash & Go Engineering Hub and search Code Updates for related work.
4. Confirm that you are editing Wash-Go/wash-and-go, not the legacy ClydeQue/Wash-Go repository.
5. Produce a preflight brief with:
   - current-state evidence;
   - problem statement;
   - scope and non-scope;
   - measurable acceptance criteria;
   - architecture and data-flow impact;
   - security, privacy, and rollback risks;
   - step-by-step implementation plan;
   - verification commands;
   - concepts I should understand while reviewing the code.
6. Identify contradictions or missing decisions instead of guessing silently.

During implementation:
- Keep the change aligned with all acceptance criteria.
- Preserve unrelated work.
- Explain non-obvious code and tradeoffs.
- Add or update tests where behavior changes.
- Never expose secrets or production data.

After implementation:
1. Run formatting, lint, type checks, tests, and builds relevant to the changed surface.
2. Report exact command outcomes and inherited failures separately.
3. Create or update docs/startup-grind/04-code-updates/YYYY-MM-DD-short-slug.md.
4. Use Update ID WAG-YYYYMMDD-short-slug.
5. If Notion MCP is connected, search that Update ID and create or update the matching Code Updates record.
6. Use .ai/prompts/COMPLETE_TASK.md for the final engineering record.
7. Return changed files, verification evidence, learning notes, limitations, and the Notion URL.

Do not call the task complete until the acceptance criteria are proven by current evidence.
```
