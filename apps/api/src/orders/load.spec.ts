import {
  LOAD_CATEGORIES,
  LOAD_CATEGORY_KEYS,
  loadCategory,
  isExpressEligible,
} from './load';

// Pins the catalog + rule so the API-local copy can't silently drift from the
// client's packages/domain/src/load.ts (both pin S/M/L = 3/6/9 kg + a 6kg ceiling).
describe('load categories (api-local)', () => {
  it('has S/M/L at 3/6/9 kg, in order', () => {
    expect(LOAD_CATEGORIES.map((c) => c.key)).toEqual(['S', 'M', 'L']);
    expect(LOAD_CATEGORIES.map((c) => c.estimateKg)).toEqual([3, 6, 9]);
    expect([...LOAD_CATEGORY_KEYS]).toEqual(['S', 'M', 'L']);
  });

  it('looks up by key; undefined for unknown', () => {
    expect(loadCategory('M')?.estimateKg).toBe(6);
    expect(loadCategory('XL')).toBeUndefined();
  });

  it('is express-eligible only within the threshold (inclusive)', () => {
    expect(isExpressEligible(loadCategory('S')!, 6)).toBe(true);
    expect(isExpressEligible(loadCategory('M')!, 6)).toBe(true); // 6 == 6
    expect(isExpressEligible(loadCategory('L')!, 6)).toBe(false); // 9 > 6
    expect(isExpressEligible(loadCategory('L')!, 10)).toBe(true);
  });
});
