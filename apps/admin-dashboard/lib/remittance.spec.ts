import { lastWeekPeriod } from './remittance';

describe('remittance helpers', () => {
  it('lastWeekPeriod returns the previous Mon→Mon week', () => {
    // Wed 2026-07-22 → last full week is Mon 2026-07-13 .. Mon 2026-07-20.
    const p = lastWeekPeriod(new Date('2026-07-22T09:30:00Z'));
    expect(p.periodStart.slice(0, 10)).toBe('2026-07-13');
    expect(p.periodEnd.slice(0, 10)).toBe('2026-07-20');
  });
});
