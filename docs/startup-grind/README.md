# Wash & Go Engineering Documentation

This directory is the version-controlled counterpart of the Wash & Go
Engineering Hub in the `Start-up grind` Notion workspace.

## Start here

| Area                                     | Purpose                                                   | Audience                            |
| ---------------------------------------- | --------------------------------------------------------- | ----------------------------------- |
| [`01-product/`](./01-product/)           | Product definition, users, value, and MVP boundary        | Founders, product, engineering      |
| [`02-architecture/`](./02-architecture/) | System boundaries, surfaces, data flow, and technology    | Engineering and technical reviewers |
| [`03-engineering/`](./03-engineering/)   | Source-of-truth rules and development workflow            | Every contributor                   |
| [`04-code-updates/`](./04-code-updates/) | Append-only, evidence-based implementation records        | Team and future maintainers         |
| [`05-decisions/`](./05-decisions/)       | Architecture Decision Records                             | Decision makers and engineers       |
| [`06-learning/`](./06-learning/)         | Concepts learned while building the product               | Whole team                          |
| [`07-operations/`](./07-operations/)     | Notion/MCP automation, release, and operational processes | Engineering and operations          |
| [`templates/`](./templates/)             | Required documentation formats                            | Humans and AI agents                |

Recommended reading order:

1. [`01-product/README.md`](./01-product/README.md) — what the startup does.
2. [`01-product/BUSINESS_RULES_PROPOSED.md`](./01-product/BUSINESS_RULES_PROPOSED.md)
   — proposed business behavior in plain language.
3. [`02-architecture/SYSTEM_OVERVIEW.md`](./02-architecture/SYSTEM_OVERVIEW.md)
   — high-level technical map.
4. [`02-architecture/README.md`](./02-architecture/README.md) — architecture
   index with document statuses.
5. [`05-decisions/README.md`](./05-decisions/README.md) — decision status and
   authority.

## Documentation levels

The structure borrows the useful parts of the Ngnair documentation library:

1. **Overview** gives a fast mental model.
2. **Deep dive** explains boundaries, flows, and technical decisions.
3. **Reference** records exact commands, APIs, schemas, and configuration.
4. **Code update** captures what changed, why, and how it was verified.
5. **Learning note** explains reusable concepts in plain language.

## Maintenance rule

Code and versioned technical decisions live in Git. Notion mirrors the material
for collaboration and discovery. A Notion page must link back to its repository
record whenever one exists.

Proposed documents are discussion material. They do not override accepted ADRs
or make a pattern mandatory.
