import { MAX_WEIGH_KG, type OrderView } from '@wash-and-go/domain';

// Weigh-in is allowed while the laundry is physically at the shop.
export function canWeigh(o: OrderView): boolean {
  return o.status === 'AT_SHOP' || o.status === 'PROCESSING';
}

// Validate a weight entry before it can change the bill (design D2 guard).
// Bounds match the API: above 0, at most MAX_WEIGH_KG (U0 T3).
export function parseWeight(input: string): { ok: boolean; kg: number } {
  const kg = Number(input);
  return { ok: isFinite(kg) && kg > 0 && kg <= MAX_WEIGH_KG, kg };
}
