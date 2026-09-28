import { Prisma } from '@prisma/client';
import { pricePreview, PricingError } from './pricing';

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

describe('pricePreview', () => {
  // Golden order (spec §6 / plan TDD): 6kg × ₱25 = ₱150 wash, 12% commission,
  // ₱65 express delivery, ₱7 service.
  it('matches the golden order breakdown', () => {
    const b = pricePreview({
      ratePhp: '25.00',
      weightKg: '6',
      commissionPct: '12.00',
      deliveryFeePhp: '65.00',
      serviceFeePhp: '7.00',
    });
    expect(b.washValuePhp.toFixed(2)).toBe('150.00');
    expect(b.commissionPhp.toFixed(2)).toBe('18.00');
    expect(b.shopRemittancePhp.toFixed(2)).toBe('132.00');
    expect(b.deliveryFeePhp.toFixed(2)).toBe('65.00');
    expect(b.serviceFeePhp.toFixed(2)).toBe('7.00');
    expect(b.customerTotalPhp.toFixed(2)).toBe('222.00');
  });

  it('commission is carved from wash, not added to the customer total (P2)', () => {
    const b = pricePreview({
      ratePhp: 25,
      weightKg: 6,
      commissionPct: 12,
      deliveryFeePhp: 65,
      serviceFeePhp: 7,
    });
    // total excludes commission entirely
    expect(b.customerTotalPhp.equals(D(150).add(65).add(7))).toBe(true);
  });

  it('rounds wash and commission to 2dp HALF_UP', () => {
    // 3.33kg × ₱25 = ₱83.25; 12% = 9.99
    const b = pricePreview({
      ratePhp: 25,
      weightKg: '3.33',
      commissionPct: 12,
      deliveryFeePhp: 0,
      serviceFeePhp: 0,
    });
    expect(b.washValuePhp.toFixed(2)).toBe('83.25');
    expect(b.commissionPhp.toFixed(2)).toBe('9.99');
    expect(b.shopRemittancePhp.toFixed(2)).toBe('73.26');
  });

  it('property: remittance + commission == wash across many inputs (P1)', () => {
    const rates = ['12.50', '25', '33.33', '99.99'];
    const weights = ['0.5', '3.33', '6', '7.7', '12.25'];
    const pcts = ['0', '10', '12', '15.5', '100'];
    for (const ratePhp of rates)
      for (const weightKg of weights)
        for (const commissionPct of pcts) {
          const b = pricePreview({
            ratePhp,
            weightKg,
            commissionPct,
            deliveryFeePhp: 65,
            serviceFeePhp: 7,
          });
          expect(
            b.shopRemittancePhp.add(b.commissionPhp).equals(b.washValuePhp),
          ).toBe(true);
        }
  });

  it('rejects zero / negative weight', () => {
    expect(() =>
      pricePreview({ ratePhp: 25, weightKg: 0, commissionPct: 12, deliveryFeePhp: 0, serviceFeePhp: 0 }),
    ).toThrow(PricingError);
    expect(() =>
      pricePreview({ ratePhp: 25, weightKg: -1, commissionPct: 12, deliveryFeePhp: 0, serviceFeePhp: 0 }),
    ).toThrow(PricingError);
  });

  it('rejects zero / negative rate', () => {
    expect(() =>
      pricePreview({ ratePhp: 0, weightKg: 6, commissionPct: 12, deliveryFeePhp: 0, serviceFeePhp: 0 }),
    ).toThrow(PricingError);
  });

  it('rejects commissionPct out of [0,100]', () => {
    expect(() =>
      pricePreview({ ratePhp: 25, weightKg: 6, commissionPct: 101, deliveryFeePhp: 0, serviceFeePhp: 0 }),
    ).toThrow(PricingError);
    expect(() =>
      pricePreview({ ratePhp: 25, weightKg: 6, commissionPct: -1, deliveryFeePhp: 0, serviceFeePhp: 0 }),
    ).toThrow(PricingError);
  });

  it('rejects negative fees', () => {
    expect(() =>
      pricePreview({ ratePhp: 25, weightKg: 6, commissionPct: 12, deliveryFeePhp: -5, serviceFeePhp: 0 }),
    ).toThrow(PricingError);
  });
});
