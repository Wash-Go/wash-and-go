import {
  DEFAULT_EXPRESS_THRESHOLD_KG,
  LOAD_CATEGORIES,
  isExpressEligible,
  type BookingConfigView,
  type LoadCategoryKey,
} from '@wash-and-go/domain';

// Booking-screen shape for the load-size options, derived from the shared
// load-category catalog (single source of truth in @wash-and-go/domain).
// `kg` is the estimate used for the price preview; `expressEligible` gates the
// Express path — over-threshold loads route to Scheduled (Tier 1). The shop
// weighs the real load at pickup and the price recomputes. (peso lives in
// @wash-and-go/ui, shared.)
export interface LoadBucket {
  key: LoadCategoryKey;
  label: string;
  example: string;
  kg: number;
  expressEligible: boolean;
}

// The buckets gated on a given Express ceiling (kg). The Book screen passes the
// admin-editable server value (GET /config/booking) so it never offers Express
// for a size the quote would refuse, or the reverse (U0 T6).
export function loadBuckets(
  thresholdKg: number = DEFAULT_EXPRESS_THRESHOLD_KG,
): LoadBucket[] {
  return LOAD_CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    example: c.example,
    kg: c.estimateKg,
    expressEligible: isExpressEligible(c, thresholdKg),
  }));
}

// The ceiling to gate on: the server's value once loaded, else the shared
// default. The default is only the stand-in while GET /config/booking is in
// flight or failed (offline); the API still enforces its own value at quote and
// create. A malformed value also falls back, so the screen never gates on NaN.
// 0 is a real setting (every size goes to Scheduled) and is kept.
export function expressCeilingKg(
  cfg: BookingConfigView | null | undefined,
): number {
  const v = cfg?.expressWeightThresholdKg;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0
    ? v
    : DEFAULT_EXPRESS_THRESHOLD_KG;
}
