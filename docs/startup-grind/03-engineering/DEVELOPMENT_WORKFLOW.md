# Development workflow

## 1. Understand

- Confirm the canonical repository and current branch.
- Read `AGENTS.md`, the nearest README, relevant code, tests, `PLAN.md`, the
  specification, and accepted ADRs.
- Fetch related Notion material when the connector is available.
- Use `.ai/prompts/START_TASK.md` to produce a preflight brief.

## 2. Define

Write measurable acceptance criteria. Separate product behavior, technical
constraints, and documentation requirements. Record assumptions explicitly.

## 3. Implement

- Create a focused branch.
- Make the smallest coherent change that meets all criteria.
- Add tests around changed behavior.
- Keep business rules in the backend and clients thin.
- Preserve unrelated changes.

## 4. Verify

Run the checks supported by the changed project:

```bash
npm run format
npm run lint
npm run type-check
npm run test
npm run build
```

Record commands that fail, including inherited failures. A successful build
does not prove tests exist or that product behavior is correct.

## 5. Explain

Create the code-update Markdown record using the template. Explain the problem,
design, important code, tradeoffs, test evidence, risks, and concepts learned.

## 6. Sync

Use the Notion MCP workflow in
[`../07-operations/NOTION_MCP_PIPELINE.md`](../07-operations/NOTION_MCP_PIPELINE.md).
Search by stable Update ID before creating a record.

## 7. Review and ship

Review the diff and verification evidence. Link the pull request, commit, local
record, and Notion record. Do not mark the change complete while required
evidence is missing.
