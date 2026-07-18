import { peso, LOAD_BUCKETS } from './format';

describe('peso', () => {
  it('formats a whole-peso string', () => {
    expect(peso('150')).toBe('₱150.00');
    expect(peso('222.00')).toBe('₱222.00');
  });

  it('adds thousands separators and 2 decimals', () => {
    expect(peso('1234.5')).toBe('₱1,234.50');
    expect(peso(1000000)).toBe('₱1,000,000.00');
  });

  it('handles zero and non-finite input', () => {
    expect(peso('0')).toBe('₱0.00');
    expect(peso('not-a-number')).toBe('₱0.00');
  });
});

describe('LOAD_BUCKETS', () => {
  it('offers Small/Medium/Large with kg + concrete examples', () => {
    expect(LOAD_BUCKETS.map((b) => b.key)).toEqual(['S', 'M', 'L']);
    expect(LOAD_BUCKETS.map((b) => b.kg)).toEqual([3, 6, 9]);
    for (const b of LOAD_BUCKETS) {
      expect(b.example.length).toBeGreaterThan(5);
    }
  });
});
