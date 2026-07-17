# Frontend surfaces

## Current surfaces

### `landing-page/`

- Next.js App Router marketing site.
- Uses the newer DOST/Figma content and visual assets.
- Runs on port `3001`.
- Active and retained during the legacy migration.

### `frontend/`

- TanStack Start, TanStack Router, React 19, Vite, and Tailwind CSS 4.
- Migrated from the legacy `ClydeQue/Wash-Go` repository on 2026-07-17.
- Runs on port `3000`.
- Contains incomplete customer-web routes and marketing components.
- Builds successfully but is an archived design/code reference, not a product
  deployable.

## Planned surfaces

- React Native/Expo customer mobile application.
- React Native/Expo rider mobile application.
- The existing Next.js site as the only public website, limited to onboarding.
- A separately deployed, authenticated internal operations console only when
  shop/admin workflows can no longer be handled by startup operations.

## Decision rule

Do not extend the archived prototype into a customer dashboard. Move approved
content and design tokens into the onboarding site or mobile packages. Public
web and private operations must have separate hosts, authentication policies,
analytics, and deployment lifecycles.
