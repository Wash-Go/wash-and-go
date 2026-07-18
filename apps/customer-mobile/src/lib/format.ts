// Pure display helpers — no React, no react-native, so they unit-test with
// plain ts-jest. Money arrives from the API as a decimal STRING; format it
// deterministically (no Intl — Hermes' Intl is partial).

export function peso(amount: string | number): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!isFinite(n)) return '₱0.00';
  const fixed = Math.abs(n).toFixed(2);
  const [intPart, dec] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = n < 0 ? '-' : '';
  return `${sign}₱${withCommas}.${dec}`;
}

// Load-size buckets (design D2) — customers can't estimate kg, so they pick a
// bucket with a concrete example; kg feeds the price preview, the shop weighs
// the real number at pickup.
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
