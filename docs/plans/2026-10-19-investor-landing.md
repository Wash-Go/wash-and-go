# Investor landing page — plan

Goal: `apps/landing-page` becomes the page we show investors: what Wash & Go is, the problem in
Zamboanga City, how the platform works, its impact for households / partner laundries / riders,
the market, what's built, the team, and how to reach us. It must not pretend the product is live.
New whale logo replaces the basket mark everywhere on the site.

Spec/source of truth for copy and numbers: `personal-docs/source/alpha-v1.0-features.md` (git-ignored
export of the founders' "Alpha v1.0 FEATURES" doc, 2026-10-18) with its images in
`personal-docs/source/alpha-media/word/media/`. Logo: `personal-docs/source/logo-whale-lockup.jpeg`.
Design authority: `DESIGN.md` (palette to be updated by Task 1). Branch: `feat/investor-landing`
off `fix/u0-audit-bugs` (which carries the landing SSR fix + working mobile menu; PR #10 still open).

## Decisions (Ban, 2026-10-19)

- Logo leads the brand: sky blue + navy from the whale lockup become the palette; terracotta demoted
  to a rare accent. DESIGN.md updated in this slice; apps re-tokened later (U1).
- Investors only: no customer waitlist, no store badges, no "Book now".
- CTA: "Request the deck" → `mailto:tatelgabrielle19@gmail.com` (email also shown as text).
- Every number on the page comes from the founders' doc with its stated source; nothing invented.

## Global Constraints

- Only `apps/landing-page` and `DESIGN.md` change (plus `.github/workflows/ci.yml` in Task 3).
  Never touch the apps, packages, API, or the lockfile beyond what landing needs.
- Copy and numbers: ONLY from `personal-docs/source/alpha-v1.0-features.md`. Where the doc
  contradicts the shipped product, the shipped product wins and the doc's older text is ignored:
  React Native/Expo (not Flutter), TomTom (not Google Maps/Firestore), e-bikes for Express (not
  motorcycles), Express ceiling 6 kg (not 5 kg), cash on delivery at launch (digital payment is
  "planned"). Service fee: use the business-plan figure ₱13 when the unit-economics table is shown,
  and note it in the report (the code default is ₱7 — founders to confirm).
- Stage wording: "Alpha built, pre-launch — Zamboanga City pilot" (the doc's header says "ZAMBOANGA
  CITY PILOT"; no month, no barangay list, no committed shops are stated — do not add any).
  Shop names in screenshots (Tetuan Laundry Hub, Guiwan Wash Center) are pilot partner shops per
  the doc's map caption; it's fine for them to appear in screenshots.
- Team: Gabrielle Tatel — Business (CEO; finance model, pitch); Clyde — UI/UX (design system,
  hi-fi UI); Van — Engineering (platform, alpha deployment). Titles exactly as the doc's
  "Remaining Deliverables" implies; no bios beyond that, no photos (text cards). AZUL Hub: say
  "Incubated at AZUL Hub, Ateneo de Zamboanga University (ADZU-TBI)".
- DESIGN.md rules stay: Archivo Expanded 800 display, Atkinson Hyperlegible Next body, Atkinson
  Mono for numbers, left-aligned editorial layout, no 3-column icon grids, no centered-everything,
  no stock photos, no decorative blobs, no invented testimonials, no disabled CTAs, headings a full
  step apart, one primary CTA per viewport.
- Real assets only: the doc's screenshots (converted to WebP ≤200 KB each, with width/height set),
  the whale logo, typographic sections otherwise.
- Performance: fonts ≤200 KB total per page (static woff2 subsets, `font-display: swap`); the
  built home page ≤1 MB transferred; images lazy below the fold.
- Accessibility: landmark elements, one `<h1>`, alt text on every image, visible focus, colour
  contrast ≥4.5:1 for text (compute and report the pairs used).
- Tests: keep `react-singleton.test.ts` + `Navbar.test.tsx` green; add vitest tests for any new
  pure logic; the build must produce `/` HTML containing the hero `<h1>` text (script in Task 3).
- Commits: Conventional Commits, full-prose body, trailer exactly
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; write the message to a file and use
  `git commit -F`. Never push. Never touch `main` or `feat/api-express-lite-slice`.

## Task table

| Task | Title | model | where | reviewer model |
|---|---|---|---|---|
| 1 | Brand: whale logo assets + palette tokens + DESIGN.md update | opus | in place | sonnet |
| 2 | Investor page: sections, copy, screenshots, route cleanup, SEO | opus | in place | opus (content accuracy) |
| 3 | Verification: build/SSR check script, CI for landing + ui tests, responsive smoke | opus | in place | sonnet |

## Task 1: Brand: whale logo assets + palette tokens + DESIGN.md update

**Inputs:** `personal-docs/source/logo-whale-lockup.jpeg` (1260×1260, whale mark above a "WASH & GO"
wordmark, on white). ImageMagick (`magick`) and Pillow are available; potrace/inkscape are not.

**Deliverables:**
1. `apps/landing-page/src/assets/brand/` — `logo-lockup.png` (transparent, 2× = 1260 px wide max,
   white keyed out cleanly with anti-aliased edges, not a hard threshold), `logo-mark.png` (whale +
   waves only, cropped, transparent), `logo-lockup.webp` + `logo-mark.webp`, and a hand-written
   `logo-mark.svg` ONLY if you can produce a faithful vector (trace by hand in SVG paths from the
   bitmap is acceptable if it matches; otherwise skip the SVG and say so — no approximations).
2. Favicons from the mark: `public/favicon.ico` (32), `public/favicon-32.png`, `public/icon-192.png`,
   `public/icon-512.png`, `public/apple-touch-icon.png` (180); `public/manifest.json` updated
   (name, icons, `theme_color` = navy, `background_color` = white).
3. OG image `public/og.png` 1200×630: white or sky-blue field, logo lockup, the one-line tagline
   from Task 2's hero ("Laundry pickup, delivery and settlement for Zamboanga City") — generate with
   Pillow using the Archivo/Atkinson font files if present in the repo, else system Helvetica, and
   say which.
4. Palette: sample the logo's actual colours (report the hex you measured): sky blue (body), navy
   (wordmark/eye), white. Define tokens in `apps/landing-page/src/styles/globals.css` `@theme`:
   `--color-brand-sky`, `--color-brand-navy`, `--color-brand-navy-deep`, `--color-brand-sky-tint`
   (a ≥10:1-on-navy / ≤1.1:1-on-white tint for section backgrounds), `--color-ink` (#14202B kept),
   `--color-muted`, `--color-line`, `--color-ground`, `--color-accent` (terracotta #A64B16, rare).
   Compute and report contrast: navy on white, white on navy, ink on sky-tint, sky on navy (large
   text only if <4.5).
5. DESIGN.md: update the YAML `colors` block and the "## Colors" prose to the new palette (navy =
   structure/primary, sky = brand/identity + large graphics + tints, white surfaces, terracotta
   demoted to `accent`), rewrite the "no water" rule to "no bubbles/sparkle/spin-cycle clichés —
   the whale and wave are the only water motif", and add a Decisions Log row dated 2026-10-19
   "Logo leads: whale lockup palette adopted; terracotta demoted" with the rationale. Run
   `bun --no-env-file run ~/.claude/skills/gstack/bin/gstack-design-md.ts check DESIGN.md` and keep
   `DESIGN_MD_FORMAT: spec`.
6. Delete the old basket mark `src/assets/images/logos/branding.svg` and any other logo/stock
   assets no longer referenced after Task 2 lands — do NOT delete in this task; list them in the
   report for Task 2.

**Tests:** a vitest test that imports the token names from globals.css (text read) and asserts
the required tokens exist and the contrast pairs you computed meet the thresholds (pure function).

## Task 2: Investor page: sections, copy, screenshots, route cleanup, SEO

**Inputs:** scout map `.superpowers/scout-landing.md`; Task 1's assets/tokens; the doc + media.

**Page (single route `/`), sections in order, each a component under `src/components/sections/`:**
1. **Hero** — navbar with the lockup; `<h1>`: "Laundry pickup, delivery and settlement for
   Zamboanga City." Sub-line (from doc 1.1): a scheduling-first laundry marketplace that aggregates
   trusted local laundry shops and coordinates collection, washing and doorstep return. Stage line:
   "Alpha built · pre-launch · Zamboanga City pilot". Primary CTA "Request the deck" (mailto),
   secondary "How it works" anchor. No store badges, no booking.
2. **The problem** — three sourced facts as a stat row with citations (not a 3-column icon grid;
   use a numbered editorial list or large-number typographic stats with the source in small text):
   women average 6.5 h/day on unpaid care work vs 2.43 h for men (Oxfam Pilipinas 2021); 78% call
   laundry their most-disliked chore, ~16.7% annual growth in laundry demand (Inquirer Business
   2019); only ~49–54% of Filipino households own a washing machine, 3% in the lowest-income
   households (Euromonitor 2025, PSA 2024). Then the shop side: ~119 laundry shops in Zamboanga City,
   ~₱25/kg city average, paper tracking, cash-only, idle off-peak capacity, no laundry platform in
   the city (LaundryAtlas 2026).
3. **How it works** — the custody chain for one order: book (load size S/M/L, pickup pin) → rider
   picks up → partner shop weighs the real load and the final price is set → wash → rider returns →
   cash on delivery. Three columns max on desktop is fine ONLY as a horizontal timeline (steps with
   numbers), not icon cards. Use real screenshots: customer dashboard (image3), load size (image17),
   checkout (image16), rider job board (image4), portal queue (image2).
4. **Two tiers, three services** — Express (≤6 kg, e-bike, same day, Tier 2) / Scheduled (any
   size, pickup window, Tier 1 Piaggio batch) / Business (recurring, Tier 1). Table from the doc's
   "Service Category" table. Screenshots image15 + image12 (Scheduled flow). One sentence on the
   hybrid fleet model (company-operated Piaggios in dense zones, third-party operators as demand
   grows) — from the doc, marked as the plan.
5. **Impact** — per actor, mechanism statements only (no invented numbers): households (time back,
   price known before pickup, weighed-and-confirmed billing), partner laundries (new predictable
   order flow, no delivery staff, weekly payouts, 88% of wash value), riders (e-bike jobs dispatched
   by proximity and load, cash reconciled per order).
6. **Business model** — three revenue streams table (12% commission from shop remittance; delivery
   fee ₱40 scheduled / ₱65–80 express; ₱13 platform service fee) and the representative 6 kg order
   table (₱150 wash → ₱132 shop / ₱18 commission; +₱40 delivery; +₱13 fee; ₱198 bill; ₱66 gross;
   ₱57 net contribution) — copy the doc's Table 4 exactly.
7. **Market** — bottom-up vs top-down (population 1,018,894 PSA 2024; ~230k households; 119 shops;
   TAM ~₱60–110M/yr; SAM ~₱24–44M; SOM Y1 ~₱2.83M → Y3 ~₱3.82M wash GMV) as a compact table with
   the "Basis" column, plus the one-line reconciliation sentence. Target segments as a short list
   (working professionals, university students, households, B2B phase 2). Competitive position in
   3–4 lines (walk-in shops become partners; food/courier platforms 20–30% commission vs 12%).
8. **What's built** — "Alpha v1.0": four apps + backend, with the admin screenshots (dispatch
   image10, zones image22, rider cash image19, business rules image5, payouts image6) in a scrolling
   or 2-up gallery; the engine list from the doc (pricing engine with Decimal math, distance
   delivery fee via TomTom, express capacity lock, remittance batching, rider cash reconciliation,
   role matrix, admin-editable rules, zones, MapsProvider boundary). Quality line: the doc's
   "166 backend tests, 10 browser smokes, CI" numbers are stale — use the current repo numbers from
   your own run (count API unit + integration tests, e2e specs) and write them as "as of 2026-10".
   Road map: "Next: alpha field test with pilot partner shops; Scheduled/Tier-1 batch routing;
   business accounts; digital payments" (all from the doc's deliverables/plan; no dates).
9. **Team** — three text cards (no photos) per Global Constraints; AZUL Hub / ADZU line.
10. **Ask / contact** — "Request the deck" CTA again, the email as text, "Incubated at AZUL Hub,
    Ateneo de Zamboanga University". Footer: © Wash & Go, Zamboanga City; no legal links yet
    (Terms/Privacy pending approval) — leave a comment where they go.

**Routes:** delete `/services`, `/pricing`, `/book-order`, `/my-orders` files; add redirects to
`/#how-it-works` (TanStack `redirect` in a loader, or a Vercel `redirects` entry — whichever the
app already has a pattern for; prerender list updated). Navbar links become in-page anchors
(Problem, How it works, Model, Market, Team) + the CTA; mobile menu keeps Task 9's behaviour.
Styled 404 route.

**Screenshots:** copy the referenced `imageN.png` files into `src/assets/screens/` with descriptive
names (`customer-dashboard.png`…), convert to WebP (quality ~80, ≤200 KB each, keep 2× for phones),
set explicit width/height, alt text that describes the screen. Phone screenshots inside a simple
CSS phone frame (border-radius + shadow is fine; no device mockup images).

**SEO:** per-route `<title>` ("Wash & Go — Laundry logistics for Zamboanga City"), meta description,
OG/Twitter tags pointing at `/og.png`, canonical, favicon links, `lang="en"`. `robots` allowed.

**Tests:** vitest for any pure helpers (e.g. the stats/currency formatter); Navbar tests updated
for the new anchor links; `pnpm --filter <landing pkg> build` passes.

## Task 3: Verification: build/SSR check script, CI, responsive smoke

1. `apps/landing-page/scripts/check-ssr.mjs`: builds (or uses an existing build), reads the
   prerendered `/` HTML and fails unless it contains the `<h1>` text and no React error markers;
   wire it as `pnpm --filter <landing> check:ssr` and run it after `build` in the landing `package.json`
   (`postbuild` or a `build:check` script — pick what Vercel will run).
2. `.github/workflows/ci.yml`: add landing-page and packages/ui to the unit-test job and run
   `check:ssr` in the build job (smallest change; keep existing jobs intact).
3. Playwright smoke from the `e2e/` workspace against `vite preview` of the built landing: 390×844
   and 1440×900 full-page screenshots of `/`, hamburger opens/closes, every anchor link lands on
   its section, `/pricing` redirects, no console errors; save screenshots to
   `.superpowers/landing-smoke/` (git-ignored) and list them in the report. Also run Lighthouse via
   Playwright/CDP or `npx lighthouse` if available and report performance/accessibility scores and
   transferred bytes (do not fail the task on scores; report them).
4. Report the contrast pairs actually used in the page and any DESIGN.md deviation.
