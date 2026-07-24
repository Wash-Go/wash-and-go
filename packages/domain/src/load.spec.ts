import {
  LOAD_CATEGORIES,
  LOAD_CATEGORY_KEYS,
  loadCategory,
  isExpressEligible,
  DEFAULT_EXPRESS_THRESHOLD_KG,
} from './load';

describe('load categories', () => {
  it('has S/M/L with ascending estimate kg', () => {
    expect(LOAD_CATEGORIES.map((c) => c.key)).toEqual(['S', 'M', 'L']);
    expect(LOAD_CATEGORIES.map((c) => c.estimateKg)).toEqual([3, 6, 9]);
  });

  it('keys array matches the catalog order', () => {
    expect([...LOAD_CATEGORY_KEYS]).toEqual(LOAD_CATEGORIES.map((c) => c.key));
  });

  it('looks up by key; undefined for an unknown key', () => {
    expect(loadCategory('M')?.label).toBe('Medium');
    expect(loadCategory('XL')).toBeUndefined();
  });

  describe('express eligibility', () => {
    it('S and M are eligible at the default 6kg threshold; L is not', () => {
      expect(isExpressEligible(loadCategory('S')!)).toBe(true);
      expect(isExpressEligible(loadCategory('M')!)).toBe(true); // 6 == 6, inclusive
      expect(isExpressEligible(loadCategory('L')!)).toBe(false); // 9 > 6
    });

    it('respects a custom (config-driven) threshold', () => {
      expect(isExpressEligible(loadCategory('L')!, 10)).toBe(true);
      expect(isExpressEligible(loadCategory('M')!, 5)).toBe(false);
    });

    it('exposes the default threshold as 6kg', () => {
      expect(DEFAULT_EXPRESS_THRESHOLD_KG).toBe(6);
    });
  });
});
