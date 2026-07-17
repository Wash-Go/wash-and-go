# Architecture documents

Start with the system overview, then read only the deeper document relevant to
the work.

| Document                               | Status                                       | Purpose                                                         |
| -------------------------------------- | -------------------------------------------- | --------------------------------------------------------------- |
| `SYSTEM_OVERVIEW.md`                   | Mixed: labels accepted and proposed sections | Short map of applications and system boundaries                 |
| `MOBILE_WEB_MAPS_PLAN.md`              | Accepted direction with proof gates          | React Native, onboarding web, and TomTom plan                   |
| `FRONTEND_SURFACES.md`                 | Accepted direction                           | Current, archived, and planned user interfaces                  |
| `BACKEND_MODULAR_MONOLITH_PROPOSAL.md` | **Proposed**                                 | Backend modules, repository rule, API style, workers, and Nginx |

## Status meanings

- **Proposed:** available for discussion; not an implementation requirement.
- **Accepted:** approved direction; changes require a superseding ADR.
- **Implemented:** verified in running code, not merely documented.

Never describe a proposal as accepted or implemented because it appears in a
diagram or plan.
