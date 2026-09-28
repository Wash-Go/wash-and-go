---
# gstack: design-md-format=spec
name: Wash & Go — Claim Ticket
description: A custody trail you can see. Ink-navy structure, a terracotta stamp that means "your turn", plain sturdy type that holds up in Zamboanga noon sun.
colors:
  ink: "#004375"
  ink-deep: "#00335A"
  ink-tint: "#E3ECF4"
  on-ink: "#FFFFFF"
  stamp: "#A64B16"
  stamp-press: "#8A4012"
  on-stamp: "#FFFFFF"
  terracotta: "#C96A28"
  peach: "#FFE3CC"
  peach-ink: "#8A4012"
  text: "#14202B"
  text-muted: "#4A5968"
  line: "#D9DEE3"
  line-strong: "#B9C2CB"
  ground: "#F5F3EE"
  surface: "#FFFFFF"
  sunken: "#EEF0F2"
  success: "#1F7A4D"
  success-tint: "#DDF1E6"
  success-ink: "#155C39"
  danger: "#B3261E"
  danger-tint: "#FBE4E2"
  warning-tint: "#FFF1CC"
  warning-ink: "#7A5200"
  shop-tint: "#EFE7DC"
  shop-ink: "#5B4631"
  neutral-tint: "#ECEEF0"
  neutral-ink: "#475563"
  dark-ground: "#0E1A24"
  dark-surface: "#142331"
  dark-sunken: "#0B151E"
  dark-line: "#253545"
  dark-line-strong: "#34495D"
  dark-text: "#E8EEF4"
  dark-text-muted: "#9FB3C8"
  dark-ink: "#8CB8E0"
  dark-ink-tint: "#15283A"
  dark-stamp: "#E07A3A"
  dark-on-stamp: "#1A0D05"
  dark-peach: "#3A2416"
  dark-peach-ink: "#FFC9A3"
  dark-success: "#5FC08F"
  dark-success-tint: "#12301F"
  dark-danger: "#F08A82"
  dark-warning-ink: "#F2C45A"
  dark-warning-tint: "#33280A"
typography:
  display:
    fontFamily: Archivo
    fontWeight: 800
    fontStretch: 125%
    fontSize: clamp(2.5rem, 6vw, 4.6rem)
    lineHeight: 0.98
    letterSpacing: -0.01em
  display-app:
    fontFamily: Archivo
    fontWeight: 800
    fontStretch: 118%
    fontSize: 26px
    lineHeight: 1.05
  h1:
    fontFamily: Atkinson Hyperlegible Next
    fontWeight: 800
    fontSize: 26px
    lineHeight: 1.2
  h2:
    fontFamily: Atkinson Hyperlegible Next
    fontWeight: 700
    fontSize: 20px
    lineHeight: 1.3
  title:
    fontFamily: Atkinson Hyperlegible Next
    fontWeight: 700
    fontSize: 16px
    lineHeight: 1.35
  body:
    fontFamily: Atkinson Hyperlegible Next
    fontWeight: 400
    fontSize: 16px
    lineHeight: 1.5
  small:
    fontFamily: Atkinson Hyperlegible Next
    fontWeight: 400
    fontSize: 14px
    lineHeight: 1.45
  label:
    fontFamily: Atkinson Hyperlegible Next
    fontWeight: 700
    fontSize: 12px
    letterSpacing: 0.08em
  mono:
    fontFamily: Atkinson Hyperlegible Mono
    fontWeight: 500
    fontFeature: tnum
  money-hero:
    fontFamily: Atkinson Hyperlegible Mono
    fontWeight: 700
    fontSize: 44px
    lineHeight: 1.1
rounded:
  sm: 6px
  md: 10px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  4xl: 96px
components:
  button-primary:
    backgroundColor: "{colors.stamp}"
    textColor: "{colors.on-stamp}"
    rounded: "{rounded.md}"
    minHeight: 48px
  button-primary-pressed:
    backgroundColor: "{colors.stamp-press}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.md}"
    minHeight: 48px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.ink}"
    borderWidth: 2px
    rounded: "{rounded.md}"
  button-destructive:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    borderColor: "{colors.danger}"
    borderWidth: 2px
    rounded: "{rounded.md}"
  button-disabled:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.text-muted}"
  input:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.line-strong}"
    borderWidth: 1.5px
    focusBorderColor: "{colors.ink}"
    rounded: "{rounded.md}"
    minHeight: 48px
    fontSize: 16px
  input-money:
    borderColor: "{colors.stamp}"
    borderWidth: 2px
    minHeight: 56px
    fontFamily: Atkinson Hyperlegible Mono
    fontSize: 26px
  chip-needs:
    backgroundColor: "{colors.peach}"
    textColor: "{colors.peach-ink}"
    borderColor: "{colors.stamp}"
    rounded: "{rounded.full}"
  chip-moving:
    backgroundColor: "{colors.ink-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
  chip-at-shop:
    backgroundColor: "{colors.shop-tint}"
    textColor: "{colors.shop-ink}"
    rounded: "{rounded.full}"
  chip-done:
    backgroundColor: "{colors.success-tint}"
    textColor: "{colors.success-ink}"
    rounded: "{rounded.full}"
  chip-cancelled:
    backgroundColor: "{colors.neutral-tint}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.full}"
  chip-warning:
    backgroundColor: "{colors.warning-tint}"
    textColor: "{colors.warning-ink}"
    rounded: "{rounded.full}"
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.line}"
    rounded: "{rounded.lg}"
  status-block:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.lg}"
  rider-collect:
    backgroundColor: "{colors.peach}"
    borderColor: "{colors.stamp-press}"
    borderWidth: 2.5px
    rounded: "{rounded.lg}"
  rider-slide:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.full}"
    height: 64px
  table-row:
    height: 40px
    borderColor: "{colors.line}"
  nav-sidebar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
  nav-link:
    textColor: "{colors.text}"
---

# Wash & Go — Claim Ticket

## Overview

**Creative North Star:** Claim Ticket. Customers hand their clothes to a partner shop and a rider they have never met, so the product's job is custody. Every screen answers three questions before anything else: who has my clothes, what did they weigh, what do I owe. The look borrows from the paper trail of a neighborhood laundry you trust (claim tickets, a round shop stamp, weights written down) and executes it with modern precision.

**Product context:** Scheduling-first laundry pickup and delivery marketplace for Zamboanga City, PH. Express (e-bike, ≤6 kg, same day), Scheduled (any size, pickup window, Piaggio batch), Business (recurring). Platform auto-matches a verified partner shop; a platform rider does pickup and return; cash on delivery at launch. Users live with Grab, foodpanda, GCash and Shopee patterns, often on budget Android phones and mobile data.

**Mode per surface:**
- Customer app: Operate, with one Persuade moment (booking). Comfortable density, the ticket motif lives here.
- Rider app: Operate, outdoors. **Sun Mode** (always light, high contrast, big targets). No decoration.
- Laundry portal: Operate, on a phone during a busy shift. Compact, error-proofed money inputs.
- Admin console: Operate, dense. Compact density, dark mode supported. No decoration.
- Landing page: Persuade. Editorial, left-aligned, the most expressive surface.

**Reference sites:** Xavier's Wash & Go (xavierslaundry.com, local competitor, bubbles + green), Laundryheap, Poplin, Grab PH, GCash, foodpanda PH, Lalamove PH. Research + screenshots: `~/.gstack/projects/Banyel3-wash-and-go/designs/research/`. Live audit of every current screen: `.../designs/audit/{customer,rider,portal,admin,landing}/`.

**Key characteristics:**
- Navy structure you can trust; one terracotta stamp that always means "this is your next step".
- Numbers are the promise: money, weights, codes and times in a mono face, large, in the same place everywhere.
- Faces and barangays before maps: the named rider, the named shop, the barangay on every stamp.
- No water. No bubbles, aqua, sparkles or spin-cycle art anywhere.

## Colors

**Strategy:** Restrained. Ink navy carries structure (headers, status blocks, sidebar, secondary emphasis). Stamp terracotta appears only where someone must act; a screen has at most one solid stamp-filled button. Everything else is warm-neutral ground, white surfaces and carbon text.

**Light or dark:** Light by default on every surface, decided by the use scene: riders work outdoors in strong sun, customers and shop owners use budget phones in bright rooms. The rider app is **always light** (Sun Mode ignores the system theme; a dark screen becomes a mirror in sunlight). Admin and portal support a dark theme via `prefers-color-scheme` using the `dark-*` tokens; the customer app sets `userInterfaceStyle: "light"` until a dark palette is designed and tested there.

**Roles:**
- `stamp` is the only fill for primary actions (white text 5.8:1). `terracotta` (#C96A28, the brand's historic orange) is for large graphics only: the chop stamp, icons ≥24px, the timeline "now" node. Never put white text on `terracotta` (3.77:1 fails).
- `peach` + `peach-ink` with a `stamp` outline is "needs you" as a state (chips, highlight rows). Solid stamp is reserved for the button.
- Order-status chips follow phases, not a rainbow: moving (booked, assigned, picked up, out for delivery) = `ink-tint`; at the shop (at shop, washing, ready) = `shop-tint`; delivered = `success-tint`; cancelled = `neutral-tint`. "Needs you" is actor-relative and overrides the phase for whoever must act. Always icon + word + color.
- `warning` is for limits and deltas (over cash cap, weigh-in far from estimate). `danger` is only for destructive actions and failures, never for plain "cancelled" status.
- Dark mode is a surface ladder (`dark-sunken` < `dark-ground` < `dark-surface`), not an inversion; ink and stamp lighten (`dark-ink`, `dark-stamp`) and text on a stamp fill flips to `dark-on-stamp`. Every input, select and textarea is themed.

**Retired:** `#FF9F5A` (fails contrast, reads as foodpanda/Shopee), `#A9D6EE` and `#5E9ACB` (laundry-water cliché), `#3D5975` and `#586779` (duplicate navies on the landing page), `#208AEF` (Expo template blue in admin + portal), `#D07A29` (drifted terracotta in code).

**Contrast (computed):** ink/white 10.2, stamp/white 5.8, carbon/white 16.5, muted/white 7.2, peach-ink/peach 6.1, success 5.3, danger 6.5, warning-ink/tint 6.2, shop-ink/tint 7.2, neutral-ink/tint 6.6, dark text/ground 15.1, dark muted 8.2, dark stamp/ground 5.9.

## Typography

**Faces (all Google Fonts, SIL OFL, latin + latin-ext so ñ and ₱ render; verified 2026-09-28):**
- **Archivo, Expanded (wdth 112–125), ExtraBold 800** — display only: landing headlines, the one big status line per app screen, section titles on marketing. Wide and heavy like a painted shop sign or rubber stamp; continues the heavy-wide headlines on the team's original board without Unbounded's rounded web3 feel. Never below 22px, never for body.
- **Atkinson Hyperlegible Next** — all body and UI text on every surface. Designed by the Braille Institute for low-vision legibility, so it survives noon sun on a budget Android. Weights 400/700/800 (500 allowed for UI emphasis). Replaces Plus Jakarta Sans (apps) and Montserrat (landing), both overused.
- **Atkinson Hyperlegible Mono** — money, weights, order codes, times, table numerics. Fixed-width digits so columns align and 1/7/0 never blur.

**Loading:** Mobile apps bundle the font files via `expo-font` (no runtime download on mobile data). Web apps self-host static woff2 subsets (latin + latin-ext): Archivo wdth125 wght800 only; Atkinson Next 400/700/800; Mono 500/700. Use `font-display: swap` and preload the display face on the landing page. Budget ≤ 200 KB fonts total per web page.

**Scale:** display (clamp 40→74px) › display-app 26 › h1 26/800 › h2 20/700 › title 16/700 › body 16 › small 14 › label 12 caps +0.08em. Levels differ by more than weight. Money hero (rider cash to collect) 44px mono 700.

**Rules:** One `<Text variant>` component per platform; no raw `fontWeight` or ad-hoc font sizes (the audit found untyped text falling back to the system font and synthetic bold). Inputs use the body face at ≥16px (prevents iOS zoom). Filipino/Chavacano strings run ~20–30% longer than English: no all-caps on long words, no fixed-width text containers.

## Layout

- **Mobile (customer, rider, portal on phone):** single column, 16px screen padding, 24px between sections, 8px between related items. Primary action in a sticky bottom bar within the thumb zone. Bottom tabs for top-level navigation (3–4 tabs, labels always visible, safe-area inset respected).
- **Rider Sun Mode:** 16px padding; body ≥17px; address 22px/700; cash to collect ≥28px (hero 44px); touch targets ≥56dp for the primary action, ≥48dp otherwise, 8dp gaps. One current stop shown large; the other stop collapsed. Leg badge (Pickup · to shop / Return · to customer) on every job.
- **Portal:** phone-first (breakpoints 560 / 1024). Queue grouped by "Needs you / Washing / Ready / Done" tabs with counts; one primary button per card. Below 560px tables become card lists.
- **Admin:** fluid width (no 940px cap), grouped sidebar (Operations, Network, Money, Settings) with count badges, drawer below 820px. Dense tables: 40px rows (32 compact, 48 comfortable), 13px text, mono numerics right-aligned, sticky header, pinned action column, one primary action per row, the rest in an overflow menu, detail in a side drawer.
- **Landing:** max width 1180px, editorial and left-aligned; hero is a 1.1 / 0.9 split (headline + promise | waitlist form). Section spacing 96 / 64 / 48. Allowed patterns: split hero, timeline, barangay coverage list or map, FAQ, founder note, real partner portraits. Banned: 3-column icon grids, centered-everything stacks, rotating stat banners, stock photos.

## Elevation & Depth

Flat by default: hierarchy comes from surface vs ground, 1px `line` borders and type. One soft offset shadow for things that float above content (sticky bottom bar, drawers, phone sheets): `0 8px 24px -12px rgba(20,32,43,.35)`. No zero-offset glows, no frosted glass, no nested cards (a card never contains a card; use dividers or a perforation inside the ticket).

## Shapes

`sm` 6px for chips-as-tags, table buttons and badges; `md` 10px for buttons and inputs; `lg` 16px for cards, status blocks and sheets; `full` only for status pills, the rider slide control and avatars. Nested inner radius = outer radius − gap. The customer app's current 24–28px bubbly radii shrink to `lg`.

## Components

- **Buttons:** primary (stamp fill, one per screen), ink (strong secondary, e.g. Call), secondary (ink outline), text (underlined ink), destructive (danger outline; a destructive *confirm* in a dialog may be danger-filled). States: pressed = `stamp-press`; focus-visible = 3px `ink` outline offset 2px; disabled = `sunken` fill + muted text + a reason shown nearby ("Weigh first"). Min height 48px (56px rider primary).
- **Status block (customer):** ink fill at the top of order detail: status label, the one big line (ETA/window in display-app), one sentence naming the person holding the bag, and the cash-to-have-ready row.
- **Claim ticket (customer):** order card with short code (last 4 digits large, mono), bag tag + weighed kg, a dashed perforation, then the custody trail (each step: who, where, time in mono). Future steps readable (muted, not faded below 4.5:1).
- **Chop stamp:** round mark in `terracotta`, rotated −8°, rim text `BARANGAY · ZAMBOANGA · HH:MM`, center verb (PICKED UP / WEIGHED / DELIVERED). Appears on the ticket after each confirmed handoff. The only decorative element in the system; never on rider, portal or admin.
- **People cards:** rider (name, vehicle + plate, call) and shop (name, barangay, "partner since") side by side, initials avatars until real photos exist.
- **Rider job:** leg badge (carbon fill), current-stop card (2.5px carbon border), collect-cash card (peach + stamp-press border, money-hero), icon row (Call / Navigate, 60px outlined ink), sticky slide-to-confirm whose label includes the amount ("Slide: collected ₱137.92"). Slide is required for irreversible money steps and delivery; mid-steps use a single confirm. Delivered and cash-collected are one combined action.
- **Weigh-in (portal):** labeled money input with unit suffix, `inputmode="decimal"`, 56px; live breakdown (kg × rate, delivery, service fee, total); delta vs estimate in a warning box; over-threshold weights require a second confirm; the primary button names the outcome ("Send ₱385.40 for approval"). Pending, success and error states are mandatory.
- **Chips:** see Colors. 13px/700, icon 14px, pill. Filled `peach` + stamp outline for needs-you.
- **Tables (admin):** see Layout. Money right-aligned mono; age column highlights late in `stamp`; no wall of red — destructive actions live in the overflow menu with confirm tiers (inline confirm for reversible, modal with summary for money, diff-confirm for config).
- **Feedback:** one toast component per platform (role=status / aria-live polite), inline field errors, a stale/offline banner with "updated N min ago", skeletons for loading. Human copy only: no server messages, URLs or stack text. Every error offers a recovery action that fits it (retry, back, contact).
- **Icons:** one set (Ionicons on mobile, the same glyphs as SVG on web). No emoji in UI chrome.

## Do's and Don'ts

- Do lead every order screen with who has the clothes, the weight and the amount owed.
- Do keep money in mono, large, and in the same position on list and detail views.
- Do show status as icon + word + phase color, with audience-specific wording (customer: "Rider on the way"; rider: "Pick up"; ops: "Assigned").
- Do put the rider's primary action in the sticky bottom bar with the amount in its label.
- Do format dates relative and in Asia/Manila ("Today 4:30pm", "Yesterday"), pesos as ₱1,234.50.
- Don't use water imagery: bubbles, aqua, sparkles, washing-machine spin art, pale blues.
- Don't put white text on `terracotta` or the old `#D07A29`; use `stamp`.
- Don't invent stats, stars, testimonials or "partner shops" before they exist; show real ones or an honest empty state.
- Don't use order codes, raw errors or dev copy as headlines.
- Don't ship disabled CTAs as the main action on the landing page; pre-launch the CTA is the waitlist.

## Motion

- **Approach:** minimal-functional.
- **Easing:** enter ease-out, exit ease-in, move ease-in-out.
- **Duration:** micro 50–100ms (press), short 150–250ms (chips, toasts), medium 250–400ms (sheets, drawers), long 400–700ms (none planned).
- **The one authored moment:** the stamp. When a handoff is confirmed, the chop mark lands on the ticket (scale 1.15 → 1, 250ms ease-out, slight rotation settle) with a medium haptic on mobile. Respect reduced-motion (fade only).

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-28 | Initial design system "Claim Ticket" created | /design-consultation after 4 code audits + live Playwright capture of all 5 surfaces (~190 screenshots), competitive research (Laundryheap, Poplin, Xavier's Wash & Go, Grab, GCash, foodpanda, Lalamove), and an independent Claude design voice ("Suki Ledger"); Codex voice unavailable (no usable model on the account) |
| 2026-09-28 | Custody trail as the visual language | Research and the independent voice converged: local customers fear losing track of clothes with strangers; both local competitors lead with "not mixed" |
| 2026-09-28 | Stamp #A64B16 for action fills; #C96A28 graphics-only | White on #C96A28 is 3.77:1 (fails AA); captures measured sunlight contrast failures on the rider app |
| 2026-09-28 | Archivo Expanded + Atkinson Hyperlegible Next/Mono replace Unbounded, Montserrat, Plus Jakarta Sans | Legibility on budget screens in sun; Montserrat/Plus Jakarta are overused; Unbounded reads crypto/toy |
| 2026-09-28 | Light-first; rider always light (Sun Mode); admin/portal dark theme supported | Use scene: outdoor riders, bright rooms, cheap screens |
| 2026-09-28 | Retire #FF9F5A, #A9D6EE, #5E9ACB, #3D5975, #586779, #208AEF, #D07A29 | Contrast failures, category cliché, duplicate navies, template blue, token drift |
