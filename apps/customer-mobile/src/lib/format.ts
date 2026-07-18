// Load-size buckets (design D2) — customers can't estimate kg, so they pick a
// bucket with a concrete example; kg feeds the price preview, the shop weighs
// the real number at pickup. (peso lives in @wash-and-go/ui, shared.)
export interface LoadBucket {
  key: string;
  label: string;
  example: string;
  kg: number;
}

export const LOAD_BUCKETS: LoadBucket[] = [
  { key: 'S', label: 'Small', example: '1-2 outfits, a gym bag', kg: 3 },
  { key: 'M', label: 'Medium', example: 'a full hamper', kg: 6 },
  { key: 'L', label: 'Large', example: 'a family load', kg: 9 },
];
