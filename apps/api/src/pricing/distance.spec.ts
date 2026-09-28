import { computeDeliveryFee, DeliveryConfig, haversineKm } from './distance';

const CFG: DeliveryConfig = {
  baseDeliveryPhp: 40,
  freeKm: 2,
  perKmPhp: 8,
  maxDeliveryPhp: 150,
  roadFactor: 1.3,
};

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm({ lat: 6.9111, lng: 122.0794 }, { lat: 6.9111, lng: 122.0794 })).toBe(0);
  });

  it('is symmetric', () => {
    const a = { lat: 6.9111, lng: 122.0794 }; // Tetuan
    const b = { lat: 6.9245, lng: 122.0865 }; // Guiwan
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });

  it('measures a known short distance (~1.7 km Tetuan↔Guiwan)', () => {
    const km = haversineKm({ lat: 6.9111, lng: 122.0794 }, { lat: 6.9245, lng: 122.0865 });
    expect(km).toBeGreaterThan(1.4);
    expect(km).toBeLessThan(2.0);
  });
});

describe('computeDeliveryFee', () => {
  it('is the base fee when pickup is at the shop (0 km)', () => {
    expect(computeDeliveryFee(0, CFG)).toBe(40);
  });

  it('adds per-km beyond the free round-trip allowance', () => {
    // 1km one-way -> roundTrip = 2 * 1 * 1.3 = 2.6km; billable = 0.6; fee = 40 + 0.6*8 = 44.8
    expect(computeDeliveryFee(1, CFG)).toBeCloseTo(44.8, 5);
  });

  it('caps at maxDeliveryPhp for far customers', () => {
    // 10km one-way -> roundTrip 26km -> raw 40 + 24*8 = 232 -> capped 150
    expect(computeDeliveryFee(10, CFG)).toBe(150);
  });

  it('never goes below base within the free radius', () => {
    // 0.5km one-way -> roundTrip 1.3km < 2 free -> base only
    expect(computeDeliveryFee(0.5, CFG)).toBe(40);
  });
});
