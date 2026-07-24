import type { PlatformConfigView } from '@wash-and-go/domain';
import { CONFIG_FIELDS, diffPatch, validateField } from './config';

const base: PlatformConfigView = {
  serviceFeePhp: 7,
  deliveryBasePhp: 40,
  deliveryFreeKm: 2,
  deliveryPerKmPhp: 8,
  deliveryMaxPhp: 150,
  deliveryRoadFactor: 1.3,
  maxResolveKm: 20,
  expressWeightThresholdKg: 5,
  minOrderPricePhp: 0,
  platformFeePhp: 0,
  autoDispatchEnabled: 0,
  updatedAt: '2026-07-19T00:00:00Z',
};

const editedFrom = (over: Partial<Record<string, number>> = {}) => {
  const e = {} as Record<string, number>;
  for (const f of CONFIG_FIELDS) e[f] = base[f];
  return { ...e, ...over } as Record<(typeof CONFIG_FIELDS)[number], number>;
};

describe('config editor logic', () => {
  it('diffPatch sends only changed fields', () => {
    const patch = diffPatch(base, editedFrom({ deliveryPerKmPhp: 9 }));
    expect(patch).toEqual({ deliveryPerKmPhp: 9 });
  });

  it('diffPatch is empty when nothing changed', () => {
    expect(diffPatch(base, editedFrom())).toEqual({});
  });

  it('diffPatch captures multiple changes', () => {
    const patch = diffPatch(base, editedFrom({ serviceFeePhp: 10, maxResolveKm: 25 }));
    expect(patch).toEqual({ serviceFeePhp: 10, maxResolveKm: 25 });
  });

  it('validateField rejects negatives and NaN, accepts ≥ 0', () => {
    expect(validateField(-1)).not.toBeNull();
    expect(validateField(Number.NaN)).not.toBeNull();
    expect(validateField(0)).toBeNull();
    expect(validateField(8.5)).toBeNull();
  });
});
