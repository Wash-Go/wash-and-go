## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available gstack skills:
`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`, `/retro`, `/investigate`, `/document-release`, `/document-generate`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`

Teammates: run `git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup` to install locally (requires `bun` — `brew install oven-sh/bun/bun`).

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

<!-- ban-init:begin -->
## ban-init — orchestrator + tiered subagents

This repo runs the ban-init workflow: the main session (Fable) plans, dispatches, reviews, and synthesises; subagents implement. Invoke `/ban-init` at the start of any multi-step task; it wraps `superpowers:subagent-driven-development`.

- Fable is never dispatched as a worker. Ladder: `executor` (Opus, default implementer) · `mech-executor` (Sonnet, repetitive fully-specified edits only) · `scout` (Haiku, lookups only) · `reviewer` (Sonnet, after every task) · `final-reviewer` (Opus, once per branch). If Opus is rate-limited, fall back to `mech-executor` for the current task and say so in the ledger.
- Do it directly only when it is a few tool calls with small output; otherwise dispatch. Debugging and bulk edits are dispatched.
- Never enter plan mode while a subagent is live; plan in a file.
- Worktree when the task edits files another live worker or the main checkout is editing, targets another branch or repo, or opens its own PR; otherwise in place.
- Workers write reports to files and reply in under 15 lines; progress lives in the ledger, not in chat.
- Caveman ultra in chat; full prose in code, commits, PRs, reports, and the four stop conditions.
<!-- ban-init:end -->
