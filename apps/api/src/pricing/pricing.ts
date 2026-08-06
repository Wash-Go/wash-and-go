import { Prisma } from '@prisma/client';

/*
 * Pure pricing engine (plan scope §1, ADR-003 whitelist: no I/O, no Prisma
 * client). Money is Prisma.Decimal end to end (P2) — never float. Every line
 * item is rounded to 2 dp HALF_UP, then remittance is derived by SUBTRACTION
 * (P1) so `remittance + commission == wash` holds exactly. Rates/fees/pct are
 * passed in by the caller (config-driven per CEO D1); the engine is correct
 * regardless of the numbers.
 */

const ROUND = Prisma.Decimal.ROUND_HALF_UP;
const r2 = (d: Prisma.Decimal): Prisma.Decimal => d.toDecimalPlaces(2, ROUND);

export type Money = Prisma.Decimal.Value; // number | string | Decimal

export interface PricingInput {
  ratePhp: Money; // ShopService.ratePhp (per unit)
  weightKg: Money; // billable weight (estimate at booking, actual at weigh-in)
  commissionPct: Money; // Shop.commissionPct
  deliveryFeePhp: Money; // express delivery fee (config)
  serviceFeePhp: Money; // flat service fee (config)
}

export interface PricingBreakdown {
  washValuePhp: Prisma.Decimal;
  commissionPhp: Prisma.Decimal;
  shopRemittancePhp: Prisma.Decimal;
  deliveryFeePhp: Prisma.Decimal;
  serviceFeePhp: Prisma.Decimal;
  customerTotalPhp: Prisma.Decimal;
}

export class PricingError extends Error {}

export function pricePreview(input: PricingInput): PricingBreakdown {
  const rate = new Prisma.Decimal(input.ratePhp);
  const weight = new Prisma.Decimal(input.weightKg);
  const commissionPct = new Prisma.Decimal(input.commissionPct);
  const delivery = r2(new Prisma.Decimal(input.deliveryFeePhp));
  const service = r2(new Prisma.Decimal(input.serviceFeePhp));

  if (rate.lte(0)) throw new PricingError('ratePhp must be positive');
  if (weight.lte(0)) throw new PricingError('weightKg must be positive');
  if (commissionPct.lt(0) || commissionPct.gt(100)) {
    throw new PricingError('commissionPct must be within [0, 100]');
  }
  if (delivery.lt(0) || service.lt(0)) {
    throw new PricingError('fees must be non-negative');
  }

  const washValue = r2(rate.mul(weight));
  const commission = r2(washValue.mul(commissionPct).div(100));
  // P1: remittance = wash − roundedCommission (subtraction, not an independent
  // round) so the property remittance + commission == wash is exact.
  const shopRemittance = washValue.sub(commission);
  // P2: commission is carved OUT of the wash value, not added to the customer
  // total. Customer pays wash + delivery + service.
  const customerTotal = washValue.add(delivery).add(service);

  return {
    washValuePhp: washValue,
    commissionPhp: commission,
    shopRemittancePhp: shopRemittance,
    deliveryFeePhp: delivery,
    serviceFeePhp: service,
    customerTotalPhp: customerTotal,
  };
}
