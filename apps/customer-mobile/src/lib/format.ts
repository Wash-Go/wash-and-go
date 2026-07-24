import {
  LOAD_CATEGORIES,
  isExpressEligible,
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

export const LOAD_BUCKETS: LoadBucket[] = LOAD_CATEGORIES.map((c) => ({
  key: c.key,
  label: c.label,
  example: c.example,
  kg: c.estimateKg,
  expressEligible: isExpressEligible(c),
}));
