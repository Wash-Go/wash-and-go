# Wash & Go — Landing Page

Marketing landing page for Wash & Go. Isolated from the main product apps (backend + shop dashboard + Flutter). Built per Figma design.

## Stack
- Next.js 15 (App Router) + React 19
- TypeScript
- Tailwind CSS 3
- Poppins (headings) + Inter (body) via `next/font/google`

## Design tokens
Colors sourced from Figma palette. See `tailwind.config.ts` `theme.extend.colors.brand`:

| Token | Hex | Use |
|---|---|---|
| `orange` | #CA6E27 | Primary accent, CTAs, "Anywhere" heading |
| `orange-light` | #FFA662 | Hover, soft accent |
| `peach` | #FFD4B3 | Soft backgrounds |
| `sky-light` | #B1D9EE | Testimonial cards |
| `steel-blue` | #6595BD | Secondary CTA, logo, links |
| `navy` | #2D3E4D | Headings, nav |
| `slate` | #33414E | Body |
| `gray` | #B9BCC0 | Dividers |
| `off-white` | #FAFAFA | Page background |

## Structure
- `src/app/layout.tsx` — root layout with fonts + metadata
- `src/app/page.tsx` — assembles sections in order
- `src/app/globals.css` — Tailwind + component classes (`btn-primary`, `btn-secondary`, `nav-pill`)
- `src/components/` — Nav, Hero, Stats, Schedule, Features, Testimonials, CtaBanner, Footer

## Dev
```sh
cd landing-page
npm install  # or pnpm/bun
npm run dev  # → http://localhost:3001
```

Runs on port 3001 to avoid clashing with the product web dashboard (which will use 3000).

## Content source
Content pulled from `../docs/spec.md` §1-§9 (Wash & Go — Technical Spec). Update copy in place per component.
