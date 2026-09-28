// Standardized load categories (Logistics v1.1). Customers can't estimate kg, so
// they pick a size; the category maps to a representative estimate kg for the
// booking-time price preview, and the shop weighs the real load at intake (the
// price recomputes then). Express is weight-capped: a category over the threshold
// belongs to Scheduled (Tier 1), not Express (Tier 2).
//
// Kept dependency-free so React Native / Metro can import it. The API imports the
// same catalog + rule so the client and server never disagree on eligibility.

export const LOAD_CATEGORY_KEYS = ['S', 'M', 'L'] as const;
export type LoadCategoryKey = (typeof LOAD_CATEGORY_KEYS)[number];

export interface LoadCategory {
  key: LoadCategoryKey;
  label: string;
  example: string;
  estimateKg: number; // representative kg for the booking-time quote
}

export const LOAD_CATEGORIES: LoadCategory[] = [
  { key: 'S', label: 'Small', example: '1-2 outfits, a gym bag', estimateKg: 3 },
  { key: 'M', label: 'Medium', example: 'a full hamper', estimateKg: 6 },
  { key: 'L', label: 'Large', example: 'a family load', estimateKg: 9 },
];

// The Express weight ceiling (kg). PlatformConfig.expressWeightThresholdKg is
// authoritative and can override this at runtime; the apps use this as the
// default so the UI can gate ineligible sizes without a round-trip.
export const DEFAULT_EXPRESS_THRESHOLD_KG = 6;

export function loadCategory(key: string): LoadCategory | undefined {
  return LOAD_CATEGORIES.find((c) => c.key === key);
}

// Express-eligible when the estimate kg is within the threshold (inclusive).
// Over the threshold → Scheduled (Tier 1).
export function isExpressEligible(
  cat: LoadCategory,
  thresholdKg: number = DEFAULT_EXPRESS_THRESHOLD_KG,
): boolean {
  return cat.estimateKg <= thresholdKg;
}
