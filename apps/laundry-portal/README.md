# Laundry Portal (TanStack Router SPA)

Shop-facing web app — ships Phase 1-2 because pay-at-weigh-in requires shop weight entry (debate D2.3).

MVP views: Firebase login, order queue (10s poll), weigh entry (triggers price recompute), manual rider assign, status transitions AT_SHOP → PROCESSING → READY_FOR_RETURN.

Dev: `pnpm dev` → http://localhost:3002 (landing-page owns 3000, api owns 4000).
