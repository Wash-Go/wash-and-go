import type { OrderView } from '@wash-and-go/domain';

// Weigh-in is allowed while the laundry is physically at the shop.
export function canWeigh(o: OrderView): boolean {
  return o.status === 'AT_SHOP' || o.status === 'PROCESSING';
}

// Validate a weight entry before it can change the bill (design D2 guard).
export function parseWeight(input: string): { ok: boolean; kg: number } {
  const kg = Number(input);
  return { ok: isFinite(kg) && kg > 0 && kg <= 100, kg };
}
