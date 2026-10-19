/**
 * Every number and claim on the investor page lives here, next to the place
 * in the founders' "Alpha v1.0 FEATURES" doc it was taken from
 * (personal-docs/source/alpha-v1.0-features.md, export of 2026-10-18).
 * Where the doc contradicts the shipped product, the shipped product wins
 * (e-bikes for Express, 6 kg ceiling, React Native / Expo, TomTom, cash on
 * delivery at launch). Nothing here is invented: if the doc does not say it,
 * it is not on the page.
 */
import { absoluteUrl, mailtoHref } from '../lib/links'

export const SITE_NAME = 'Wash & Go'
export const SITE_TITLE = 'Wash & Go — Laundry logistics for Zamboanga City'
export const SITE_DESCRIPTION =
  'A scheduling-first laundry marketplace for Zamboanga City: pickup, partner-shop washing, doorstep return and settlement. Alpha built, pre-launch.'

/**
 * Production origin, no trailing slash. VITE_SITE_URL wins; otherwise Vercel's
 * system variable for the production domain (exposed to Vite builds as
 * VITE_VERCEL_PROJECT_PRODUCTION_URL, host only). Unset locally, the tags fall
 * back to root-relative paths.
 */
const VERCEL_HOST: string | undefined = import.meta.env
  .VITE_VERCEL_PROJECT_PRODUCTION_URL
export const SITE_ORIGIN: string | undefined =
  import.meta.env.VITE_SITE_URL ??
  (VERCEL_HOST ? `https://${VERCEL_HOST}` : undefined)
export const CANONICAL_URL = absoluteUrl('/', SITE_ORIGIN)
export const OG_IMAGE_URL = absoluteUrl('/og.png', SITE_ORIGIN)

/** Plan decision (Ban, 2026-10-19): deck requests go to the CEO. */
export const CONTACT_EMAIL = 'tatelgabrielle19@gmail.com'
export const DECK_MAILTO = mailtoHref(
  CONTACT_EMAIL,
  'Wash & Go — investor deck request',
)

export const STAGE_LINE = 'Alpha built · pre-launch · Zamboanga City pilot'
export const INCUBATOR_LINE =
  'Incubated at AZUL Hub, Ateneo de Zamboanga University (ADZU-TBI)'

/** In-page sections linked from the navbar, in page order. */
export const NAV_SECTIONS = [
  { id: 'problem', label: 'Problem' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'model', label: 'Model' },
  { id: 'market', label: 'Market' },
  { id: 'team', label: 'Team' },
] as const

export type Stat = {
  figure: string
  unit?: string
  text: string
  source: string
}

/** Doc §1.3 "The Problem", sources as cited there and in §2.12. */
export const PROBLEM_STATS: ReadonlyArray<Stat> = [
  {
    figure: '6.5',
    unit: 'h/day',
    text: 'Average time women spend on unpaid care work, including laundry and water collection, against 2.43 hours for men.',
    source: 'Oxfam Pilipinas, National Household Care Survey (2021)',
  },
  {
    figure: '78%',
    text: 'of respondents name laundry their most disliked household chore, a factor associated with an estimated 16.7% annual growth in demand for laundry services.',
    source: 'Inquirer Business (2019)',
  },
  {
    figure: '49–54%',
    text: 'of Filipino households own a washing machine. Ownership drops to as low as 3% among the lowest-income households.',
    source:
      'Euromonitor International (2025); PSA (2024); “Dirty Laundry in Manila” (n.d.)',
  },
]

/** Doc §1.3, shop side (LaundryAtlas, 2026). */
export const SHOP_SIDE = {
  shops: '119',
  rate: '₱25/kg',
  source: 'LaundryAtlas (2026)',
}

export type Step = { title: string; text: string }

/** Doc: Customer app, Logistics v1.1, Rider app and Shop portal sections. */
export const ORDER_STEPS: ReadonlyArray<Step> = [
  {
    title: 'Book',
    text: 'The customer picks a load size (Small, Medium or Large) and a pickup: GPS, a saved address, or a typed address pinned by TomTom Search.',
  },
  {
    title: 'See the price',
    text: 'The system resolves the nearest active shop and shows wash, distance-based delivery and service fee before confirmation.',
  },
  {
    title: 'Rider picks up',
    text: 'A rider gets the job with one clear next step. Pickup → shop and shop → customer run as separate legs.',
  },
  {
    title: 'Shop weighs',
    text: 'The partner shop enters the real weight, previews the recomputed price and confirms it. That is the final price.',
  },
  {
    title: 'Wash',
    text: 'The shop drives the order from at-shop to washing to ready-for-return, in a queue that shows only its own orders.',
  },
  {
    title: 'Return and pay',
    text: 'The rider returns the load and records cash on delivery against the order. Slide-to-confirm guards the delivery step.',
  },
]

/** Doc §"Product Solution", Service Category table. */
export const SERVICE_TIERS = [
  {
    service: 'Express',
    market: 'B2C',
    description:
      'Immediate or same-day pickup for laundry loads of 6 kg or below.',
    tier: 'Tier 2 – Express E-bike Delivery',
  },
  {
    service: 'Scheduled',
    market: 'B2C',
    description:
      'Planned residential pickup with flexible scheduling for any laundry size.',
    tier: 'Tier 1 – Scheduled Piaggio Batch',
  },
  {
    service: 'Business',
    market: 'B2B',
    description:
      'One-time or recurring scheduled pickups for commercial establishments.',
    tier: 'Tier 1 – Scheduled Piaggio Batch',
  },
] as const

export type Actor = { name: string; points: ReadonlyArray<string> }

/** Mechanisms only, each traceable to a doc section; no outcome numbers. */
export const IMPACT: ReadonlyArray<Actor> = [
  {
    name: 'Households',
    points: [
      'Time back: schedule a pickup and the clothes come back to the door, washed.',
      'The price is known before pickup: wash, delivery and service fee on one screen.',
      'Billing on the real load: the shop weighs it and the final price is confirmed from that weight.',
    ],
  },
  {
    name: 'Partner laundries',
    points: [
      'A new, predictable order flow; scheduled collections let a shop plan machines and staff.',
      'No delivery staff needed: riders handle pickup and return.',
      'Weekly payouts in per-shop batches, carrying 88% of the wash value.',
    ],
  },
  {
    name: 'Riders',
    points: [
      'E-bike jobs dispatched by proximity, current workload and travel time.',
      'One clear next step per job, with pickup and return as separate legs.',
      'Cash on delivery recorded per order and reconciled against deposits.',
    ],
  },
]

export type TableRow = { cells: ReadonlyArray<string>; strong?: boolean }

/**
 * Doc §2.2, Table 3. Delivery fee wording follows the shipped product:
 * Express runs on e-bikes, not motorcycles.
 */
export const REVENUE_STREAMS: ReadonlyArray<TableRow> = [
  {
    cells: [
      'Transaction commission',
      '12% per order, deducted from shop remittance',
      'Partner laundry shop',
    ],
  },
  {
    cells: [
      'Delivery fee',
      '₱40 scheduled (Piaggio) / ₱65–₱80 express (e-bike)',
      'Customer — line item at checkout',
    ],
  },
  {
    cells: [
      'Platform service fee',
      '₱13 flat per transaction',
      'Customer — covers payment processing',
    ],
  },
]

/**
 * Doc §2.2.1, Table 4, copied row for row.
 *
 * DISABLED until the founders reconcile Table 4: the delivery row says 40,
 * but the bill (198 = 150 + 35 + 13) and gross (66 = 18 + 35 + 13) use 35.
 * An investor page cannot show arithmetic that does not add up, so this data
 * is kept here but not rendered (see SHOW_UNIT_ECONOMICS and site.test.ts).
 * Flip the flag only after the doc and these rows agree.
 */
export const SHOW_UNIT_ECONOMICS = false

export const UNIT_ECONOMICS: ReadonlyArray<TableRow> = [
  {
    cells: [
      'Wash value (6 kg × ₱25/kg)',
      '150',
      'Billed to customer; commission-based',
    ],
  },
  {
    cells: [
      '– Remitted to partner shop (88%)',
      '132',
      'Paid out to the partner shop',
    ],
  },
  { cells: ['– Commission retained (12%)', '18', 'Platform revenue'] },
  {
    cells: [
      'Delivery fee (scheduled, Tier 1)',
      '40',
      'Platform revenue — funds Piaggio operations',
    ],
  },
  {
    cells: [
      'Platform service fee',
      '13',
      'Platform revenue — covers payment processing',
    ],
  },
  {
    cells: [
      "Customer's total bill",
      '198',
      '= 150 wash + 40 delivery + 13 service',
    ],
  },
  {
    cells: ['Platform gross revenue per order', '66', '= 18 + 35 + 13'],
    strong: true,
  },
  {
    cells: ['Less: blended payment processing cost', '(9)', 'Variable OPEX'],
  },
  {
    cells: [
      'Net contribution per order',
      '57',
      'Available to cover fixed OPEX',
    ],
    strong: true,
  },
]

/** Doc "Market Opportunity & Sizing": Tables 4 (bottom-up) and 6 (funnel). */
export const MARKET_SIZING: ReadonlyArray<TableRow> = [
  {
    cells: ['Population (2024)', '1,018,894', 'PSA 2024 Census of Population'],
  },
  {
    cells: [
      'Estimated households',
      '~230,000',
      '2015 base of 193,970 + ~18% population growth',
    ],
  },
  {
    cells: ['Laundry shops in Zamboanga City', '119', 'LaundryAtlas (2026)'],
  },
  {
    cells: [
      'TAM — total ZC laundry spend',
      '~₱60M–₱110M / yr',
      'Convergence of bottom-up and top-down',
    ],
    strong: true,
  },
  {
    cells: [
      'SAM — digitally serviceable',
      '~₱24M–₱44M / yr',
      '~40% of TAM (urban-core, app-reachable)',
    ],
  },
  {
    cells: [
      'SOM — Year 1 wash GMV',
      '~₱2.83M',
      '18,840 orders × ₱150 — ~3% of TAM',
    ],
  },
  {
    cells: [
      'SOM — Year 3 wash GMV',
      '~₱3.82M',
      '25,459 orders × ₱150 — ~4–5% of TAM',
    ],
  },
]

/** Doc §2.2.2 Target Market (profiles shortened, barangays left out). */
export const SEGMENTS = [
  {
    name: 'Working professionals',
    text: 'Ages 22–45, high time-cost of laundry; weekly pickups become a household utility.',
  },
  {
    name: 'University students',
    text: 'WMSU, Ateneo de Zamboanga, Universidad de Zamboanga; bi-weekly schedules that fit academic routines.',
  },
  {
    name: 'Households and families',
    text: 'High volume per order (8–12 kg+), suited to the Piaggio batch tier.',
  },
  {
    name: 'B2B / corporate (phase 2)',
    text: 'Hotels, dormitories, government offices, small restaurants: recurring bulk pickup.',
  },
] as const

/** Doc "Competitive Analysis" table, in brief. */
export const COMPETITION = [
  {
    who: 'Walk-in shops (119 in ZC)',
    text: 'No online booking, no pickup or delivery, cash-only, paper tracking. Wash & Go adds a scheduling layer on top of them: they become partners with predictable daily order pipelines.',
  },
  {
    who: 'Food delivery platforms',
    text: '20–30% commission, a food-category focus and no laundry logistics. Wash & Go’s commission is 12%.',
  },
  {
    who: 'General couriers',
    text: 'Point-to-point delivery with no partner network, no scheduling and no weight-based pricing. Batch routing is structurally cheaper per order at scale.',
  },
] as const

/** Doc "Platform & Backend". */
export const ENGINE = {
  money: [
    'Pricing engine — Decimal math, commission by subtraction',
    'Distance delivery fee — TomTom routing, haversine fallback',
    'Express capacity — advisory lock + Manila-day window',
    'Remittance batching — per-shop payout, mark-paid',
    'Rider cash reconciliation — platform-intermediated COD',
  ],
  platform: [
    'Firebase auth, role matrix, secure-by-default guards',
    'Admin-editable business rules — audited, no redeploy',
    'Zones — coverage polygons + point-in-polygon resolve',
    'MapsProvider boundary — TomTom now, swappable',
    'Hardened — env schema, exception filter, throttler, helmet, CORS',
  ],
} as const

/**
 * Replaces the doc's stale "166 backend tests, 10 browser smokes": counted in
 * the repo on 2026-10-19 (jest test:unit summary; spec files on disk).
 */
export const QUALITY_LINE =
  'As of October 2026: 42 API spec files (434 unit tests passing across 39 suites, plus 3 integration suites), 12 Playwright end-to-end specs, CI on GitHub Actions.'

/** From the doc's Remaining Deliverables and logistics plan; no dates given. */
export const NEXT_STEPS = [
  'Alpha field test with pilot partner shops',
  'Scheduled / Tier-1 batch routing',
  'Business accounts',
  'Digital payments',
] as const

/** Doc "Remaining Deliverables" (owners and scope). */
export const TEAM = [
  {
    name: 'Gabrielle Tatel',
    area: 'Business · CEO',
    scope: 'Financial model and pitch',
  },
  {
    name: 'Clyde',
    area: 'UI/UX',
    scope: 'Design system and high-fidelity UI',
  },
  {
    name: 'Van',
    area: 'Engineering',
    scope: 'Platform and alpha deployment',
  },
] as const
