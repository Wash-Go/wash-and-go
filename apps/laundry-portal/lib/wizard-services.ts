import { peso, type BillingUnit } from '@wash-and-go/domain';

// Wizard step 3 (services & rates): unit wording, rate/turnaround rules that
// match PUT /shop/services/:serviceId (0 < rate <= 99999, 2 decimals;
// turnaround whole hours 1..720), and the "customers see" price example.

export const MAX_RATE_PHP = 99999;
export const MAX_TURNAROUND_HOURS = 720;
export const EXAMPLE_KG = 6;

export type ServiceDraft = {
  serviceId: string;
  code: string;
  name: string;
  billingUnit: BillingUnit;
  enabled: boolean;
  rate: string;
  turnaround: string;
};

export function unitLabel(u: BillingUnit): string {
  return u === 'PER_KG' ? 'per kg' : u === 'PER_PIECE' ? 'per piece' : 'flat';
}

// MoneyInput suffix.
export function unitSuffix(u: BillingUnit): string {
  return u === 'PER_KG' ? '/ kg' : u === 'PER_PIECE' ? '/ piece' : 'flat';
}

// "₱1,250.50" / "25" → number; null for anything that is not a plain peso
// amount with at most 2 decimals.
export function parseRate(raw: string): number | null {
  const s = raw.replace(/[₱,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Number(s);
}

export function rateError(raw: string): string | null {
  if (!raw.trim()) return 'Enter your rate.';
  const n = parseRate(raw);
  if (n == null || n <= 0 || n > MAX_RATE_PHP) return 'Enter a rate up to ₱99,999.00, with at most 2 decimals.';
  return null;
}

export function parseTurnaround(raw: string): number | null {
  const s = raw.trim();
  if (!/^\d+$/.test(s)) return null;
  return Number(s);
}

export function turnaroundError(raw: string): string | null {
  const n = parseTurnaround(raw);
  if (n == null || n < 1 || n > MAX_TURNAROUND_HOURS) return 'Enter whole hours from 1 to 720.';
  return null;
}

// "6 kg wash, dry & fold = ₱150.00" from the enabled WDF rate, else null.
export function priceExample(services: readonly Pick<ServiceDraft, 'code' | 'name' | 'enabled' | 'rate'>[]): string | null {
  const wdf = services.find((s) => s.code === 'WDF' && s.enabled);
  if (!wdf || rateError(wdf.rate)) return null;
  const rate = parseRate(wdf.rate)!;
  const total = Math.round(rate * EXAMPLE_KG * 100) / 100;
  return `${EXAMPLE_KG} kg ${wdf.name.toLowerCase()} = ${peso(total)}`;
}
