import { manilaDayWindow } from './manila-time';

// Capacity day-bucketing (finding T2). This math keys the advisory lock + the
// express-slot count, so a wrong Manila-day boundary over-sells or falsely
// exhausts a shop's slots. Manila = fixed UTC+8, no DST.
describe('manilaDayWindow', () => {
  it('buckets a mid-day UTC instant into the correct Manila date', () => {
    // 2026-07-20 05:00Z → Manila 13:00 same day.
    const w = manilaDayWindow(new Date('2026-07-20T05:00:00Z'));
    expect(w.dateStr).toBe('2026-07-20');
    expect(w.dayStartUtc.toISOString()).toBe('2026-07-19T16:00:00.000Z');
    expect(w.dayEndUtc.toISOString()).toBe('2026-07-20T16:00:00.000Z');
  });

  it('rolls a late-UTC evening into the NEXT Manila day (the 23:30 case)', () => {
    // 2026-07-20 23:30Z → Manila 07:30 on 2026-07-21.
    const w = manilaDayWindow(new Date('2026-07-20T23:30:00Z'));
    expect(w.dateStr).toBe('2026-07-21');
  });

  it('includes the exact Manila-midnight instant in the new day (inclusive lower bound)', () => {
    // 2026-07-19 16:00Z is exactly Manila 2026-07-20 00:00.
    const w = manilaDayWindow(new Date('2026-07-19T16:00:00.000Z'));
    expect(w.dateStr).toBe('2026-07-20');
    expect(w.dayStartUtc.toISOString()).toBe('2026-07-19T16:00:00.000Z');
  });

  it('keeps the instant one ms before Manila midnight in the previous day', () => {
    const w = manilaDayWindow(new Date('2026-07-19T15:59:59.999Z'));
    expect(w.dateStr).toBe('2026-07-19');
  });

  it('handles month rollover', () => {
    // 2026-07-31 16:00Z → Manila 2026-08-01 00:00.
    const w = manilaDayWindow(new Date('2026-07-31T16:00:00.000Z'));
    expect(w.dateStr).toBe('2026-08-01');
  });

  it('handles year rollover', () => {
    // 2026-12-31 16:00Z → Manila 2027-01-01 00:00.
    const w = manilaDayWindow(new Date('2026-12-31T16:00:00.000Z'));
    expect(w.dateStr).toBe('2027-01-01');
  });

  it('always spans exactly 24h and contains now (start ≤ now < end)', () => {
    for (const iso of [
      '2026-07-20T05:00:00Z',
      '2026-07-20T23:30:00Z',
      '2026-02-28T16:00:00Z',
      '2026-07-19T16:00:00Z',
    ]) {
      const now = new Date(iso);
      const w = manilaDayWindow(now);
      expect(w.dayEndUtc.getTime() - w.dayStartUtc.getTime()).toBe(24 * 60 * 60 * 1000);
      expect(w.dayStartUtc.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(now.getTime()).toBeLessThan(w.dayEndUtc.getTime());
    }
  });
});
