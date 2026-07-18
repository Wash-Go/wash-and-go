import { LOAD_BUCKETS } from './format';

describe('LOAD_BUCKETS', () => {
  it('offers Small/Medium/Large with kg + concrete examples', () => {
    expect(LOAD_BUCKETS.map((b) => b.key)).toEqual(['S', 'M', 'L']);
    expect(LOAD_BUCKETS.map((b) => b.kg)).toEqual([3, 6, 9]);
    for (const b of LOAD_BUCKETS) {
      expect(b.example.length).toBeGreaterThan(5);
    }
  });
});
