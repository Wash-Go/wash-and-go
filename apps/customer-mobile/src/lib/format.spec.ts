import { DEFAULT_EXPRESS_THRESHOLD_KG } from '@wash-and-go/domain';
import { expressCeilingKg, loadBuckets } from './format';

const eligibility = (thresholdKg?: number) =>
  loadBuckets(thresholdKg).map((b) => b.expressEligible);

describe('loadBuckets', () => {
  it('offers Small/Medium/Large with kg + concrete examples', () => {
    const buckets = loadBuckets(DEFAULT_EXPRESS_THRESHOLD_KG);
    expect(buckets.map((b) => b.key)).toEqual(['S', 'M', 'L']);
    expect(buckets.map((b) => b.kg)).toEqual([3, 6, 9]);
    for (const b of buckets) {
      expect(b.example.length).toBeGreaterThan(5);
    }
  });

  it('flags only the ≤6kg loads as Express-eligible at the default ceiling (Large → Scheduled)', () => {
    expect(eligibility(6)).toEqual([true, true, false]);
    expect(eligibility()).toEqual([true, true, false]); // no value = the default
  });

  // U0 T6: the ceiling is admin-editable on the server; the gating must follow it,
  // or the app offers Express for a size the quote then refuses (or the reverse).
  it('follows a raised server ceiling: at 10kg Large is Express too', () => {
    expect(eligibility(10)).toEqual([true, true, true]);
  });

  it('follows a lowered server ceiling: at 5kg Medium goes Scheduled', () => {
    expect(eligibility(5)).toEqual([true, false, false]);
  });

  it('is inclusive at the boundary, like the server rule', () => {
    expect(eligibility(3)).toEqual([true, false, false]);
    expect(eligibility(9)).toEqual([true, true, true]);
  });

  it('sends every size to Scheduled when the ceiling is 0', () => {
    expect(eligibility(0)).toEqual([false, false, false]);
  });
});

describe('expressCeilingKg', () => {
  it('uses the server value once it has loaded', () => {
    expect(expressCeilingKg({ expressWeightThresholdKg: 9 })).toBe(9);
    expect(expressCeilingKg({ expressWeightThresholdKg: 4.5 })).toBe(4.5);
  });

  it('keeps a real 0 from the server (Express off for every size)', () => {
    expect(expressCeilingKg({ expressWeightThresholdKg: 0 })).toBe(0);
  });

  it('falls back to the default only while loading or when the read failed', () => {
    expect(expressCeilingKg(null)).toBe(DEFAULT_EXPRESS_THRESHOLD_KG);
    expect(expressCeilingKg(undefined)).toBe(DEFAULT_EXPRESS_THRESHOLD_KG);
  });

  it('falls back on a malformed body rather than gating on NaN', () => {
    const bad = (v: unknown) => expressCeilingKg({ expressWeightThresholdKg: v as number });
    expect(bad(undefined)).toBe(DEFAULT_EXPRESS_THRESHOLD_KG);
    expect(bad(Number.NaN)).toBe(DEFAULT_EXPRESS_THRESHOLD_KG);
    expect(bad(-1)).toBe(DEFAULT_EXPRESS_THRESHOLD_KG);
    expect(bad('8')).toBe(DEFAULT_EXPRESS_THRESHOLD_KG);
    expect(expressCeilingKg({} as never)).toBe(DEFAULT_EXPRESS_THRESHOLD_KG);
  });
});
