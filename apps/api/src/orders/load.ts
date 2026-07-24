// Load categories — API-local mirror of packages/domain/src/load.ts. The API
// consumes shared cross-package RUNTIME values as hand-authored copies (same
// convention as order-status.ts) because the workspace packages ship as TS source,
// not a loadable build, so only type-only imports cross the boundary at runtime.
// Keep the two in sync: both spec files pin S/M/L = 3/6/9 kg and the 6kg ceiling.

export const LOAD_CATEGORY_KEYS = ['S', 'M', 'L'] as const;
export type LoadCategoryKey = (typeof LOAD_CATEGORY_KEYS)[number];

export interface LoadCategory {
  key: LoadCategoryKey;
  label: string;
  estimateKg: number; // representative kg for the booking-time quote
}

export const LOAD_CATEGORIES: LoadCategory[] = [
  { key: 'S', label: 'Small', estimateKg: 3 },
  { key: 'M', label: 'Medium', estimateKg: 6 },
  { key: 'L', label: 'Large', estimateKg: 9 },
];

export function loadCategory(key: string): LoadCategory | undefined {
  return LOAD_CATEGORIES.find((c) => c.key === key);
}

// Express-eligible when the estimate kg is within the threshold (inclusive).
// Over the threshold → Scheduled (Tier 1). Config's expressWeightThresholdKg is
// the authoritative threshold at call sites.
export function isExpressEligible(cat: LoadCategory, thresholdKg: number): boolean {
  return cat.estimateKg <= thresholdKg;
}
