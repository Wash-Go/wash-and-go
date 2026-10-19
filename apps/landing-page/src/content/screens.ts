/**
 * Screenshots from the founders' Alpha v1.0 doc (personal-docs/source/
 * alpha-media/word/media/imageN.png), converted to WebP. Phones are 520 px
 * wide (2x of the 260 px frame); desktop screens keep their 1180 px source.
 * Captions follow the doc's own captions.
 */
import adminBusinessRules from '../assets/screens/admin-business-rules.webp'
import adminDispatch from '../assets/screens/admin-dispatch.webp'
import adminRiderCash from '../assets/screens/admin-rider-cash.webp'
import adminShopPayouts from '../assets/screens/admin-shop-payouts.webp'
import adminZones from '../assets/screens/admin-zones.webp'
import coverageMap from '../assets/screens/coverage-map.webp'
import customerCheckoutExpress from '../assets/screens/customer-checkout-express.webp'
import customerCheckoutScheduled from '../assets/screens/customer-checkout-scheduled.webp'
import customerDashboard from '../assets/screens/customer-dashboard.webp'
import customerLoadSize from '../assets/screens/customer-load-size.webp'
import customerScheduledWindow from '../assets/screens/customer-scheduled-window.webp'
import portalOrderQueue from '../assets/screens/portal-order-queue.webp'
import riderJobBoard from '../assets/screens/rider-job-board.webp'
import type { Shot } from '../components/ui'

const PHONE = { width: 520, height: 1118 }
const DESKTOP = { width: 1180, height: 820 }

/** image8 */
export const COVERAGE_MAP: Shot = {
  src: coverageMap,
  ...DESKTOP,
  alt: 'TomTom map of Zamboanga City with a blue rectangle marking the active coverage zone and two pins labelled Guiwan Wash Center and Tetuan Laundry Hub.',
  caption:
    'Live map: the active coverage zone (admin-editable) and the two pilot partner shops, Tetuan Laundry Hub and Guiwan Wash Center.',
}

/** image3 */
export const CUSTOMER_DASHBOARD: Shot = {
  src: customerDashboard,
  ...PHONE,
  alt: 'Customer app home screen with a large "Book a wash" button, Schedule and Reorder shortcuts, and an empty active-order card.',
  caption: 'Dashboard: one-tap “Book a wash”, active-order card.',
}

/** image17 */
export const CUSTOMER_LOAD_SIZE: Shot = {
  src: customerLoadSize,
  ...PHONE,
  alt: 'Book pickup screen asking "How big is the load?" with Small, Medium and Large options, Medium selected, and the pickup set to Tetuan, Zamboanga City.',
  caption: 'Load size (S/M/L) and pickup: GPS, saved, or geocoded.',
}

/** image16 */
export const CUSTOMER_CHECKOUT_EXPRESS: Shot = {
  src: customerCheckoutExpress,
  ...PHONE,
  alt: 'Review and confirm screen: Guiwan Wash Center auto-picked as the closest laundry, an Express medium load, and a breakdown of wash, delivery and service fee with the total.',
  caption: 'Checkout: nearest shop and the distance price breakdown.',
}

/** image15 */
export const CUSTOMER_SCHEDULED_WINDOW: Shot = {
  src: customerScheduledWindow,
  ...PHONE,
  alt: 'Book pickup screen with a Large load selected and tagged Scheduled, and three pickup windows to choose from: tomorrow morning, tomorrow afternoon, or in two days.',
  caption: 'Large load goes to Scheduled: pick a pickup window (Tier 1).',
}

/** image12 */
export const CUSTOMER_CHECKOUT_SCHEDULED: Shot = {
  src: customerCheckoutScheduled,
  ...PHONE,
  alt: 'Review and confirm screen for a Large load with a Scheduled badge, the chosen pickup date and time, and the price breakdown.',
  caption: 'Checkout: Scheduled badge and the chosen pickup time.',
}

/** image4 */
export const RIDER_JOB_BOARD: Shot = {
  src: riderJobBoard,
  ...PHONE,
  alt: 'Rider app "My jobs" list: order cards with status chips such as Rider assigned and At the shop, and a "Mark picked up" button on the jobs that need action.',
  caption:
    'Rider job board: jobs that need action come first, with the next step.',
}

/** image2 */
export const PORTAL_ORDER_QUEUE: Shot = {
  src: portalOrderQueue,
  ...DESKTOP,
  alt: 'Shop console order queue: an order at the shop with an actual-kg field, a Preview price button and a Mark Washing button.',
  caption: 'Laundry portal: the shop’s live order queue with the weigh-in.',
}

/** image10, image22, image19, image5, image6 */
export const ADMIN_SHOTS: ReadonlyArray<Shot> = [
  {
    src: adminDispatch,
    ...DESKTOP,
    alt: 'Admin dispatch board: a table of orders with code, pickup, status, rider and total, status filters across the top, and a rider picker with an Assign button on a booked order.',
    caption: 'Dispatch board: assign a rider when auto-match falls through.',
  },
  {
    src: adminZones,
    ...DESKTOP,
    alt: 'Admin zones page: a form to draw a new zone from boundary points with a shape preview, and the active Zamboanga City pilot zone below.',
    caption: 'Zones: draw and toggle coverage areas, with a shape preview.',
  },
  {
    src: adminRiderCash,
    ...DESKTOP,
    alt: 'Admin rider cash page: outstanding cash across riders, and a per-rider row of collected, deposited and outstanding amounts with a form to record a deposit.',
    caption: 'Rider cash: COD collected vs deposited; record deposits.',
  },
  {
    src: adminBusinessRules,
    ...DESKTOP,
    alt: 'Admin business rules page: editable service fee, delivery base fee, free radius, per-km rate, cap and road factor, matching radius, and the Express weight cutoff.',
    caption:
      'Business rules: fees, delivery parameters and thresholds, live with no redeploy.',
  },
  {
    src: adminShopPayouts,
    ...DESKTOP,
    alt: 'Admin shop payouts page: owed, pending-batch and paid-batch totals, status filters, and a Close last week button.',
    caption:
      'Shop payouts: close a period into per-shop batches, mark paid with a transfer reference.',
  },
]
