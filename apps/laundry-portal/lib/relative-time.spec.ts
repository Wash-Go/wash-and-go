import { formatAgo, formatUpdatedAgo, manilaClock, manilaDate } from './relative-time';

// 2026-10-19 15:12:00 in Manila (UTC+8) = 07:12:00Z.
const NOW = new Date('2026-10-19T07:12:00Z').getTime();
const ago = (ms: number) => NOW - ms;

describe('manilaClock', () => {
  it('formats a time in Asia/Manila, lower-case, no space', () => {
    expect(manilaClock(new Date('2026-10-19T07:12:00Z'))).toBe('3:12pm');
    expect(manilaClock(new Date('2026-10-18T16:05:00Z'))).toBe('12:05am');
  });
});

describe('formatUpdatedAgo', () => {
  it('says just now under 5 seconds', () => {
    expect(formatUpdatedAgo(ago(2_000), NOW)).toBe('updated just now');
    expect(formatUpdatedAgo(NOW + 3_000, NOW)).toBe('updated just now'); // clock skew
  });

  it('counts seconds under a minute', () => {
    expect(formatUpdatedAgo(ago(12_400), NOW)).toBe('updated 12 s ago');
  });

  it('counts minutes under an hour', () => {
    expect(formatUpdatedAgo(ago(4 * 60_000 + 10_000), NOW)).toBe('updated 4 min ago');
  });

  it('counts hours under six hours', () => {
    expect(formatUpdatedAgo(ago(2 * 3_600_000 + 60_000), NOW)).toBe('updated 2 h ago');
  });

  it('names the Manila day after that', () => {
    // 07:00 Manila today.
    expect(formatUpdatedAgo(new Date('2026-10-18T23:00:00Z').getTime(), NOW)).toBe(
      'updated today 7:00am',
    );
    // 22:30 Manila yesterday (14:30Z Oct 18).
    expect(formatUpdatedAgo(new Date('2026-10-18T14:30:00Z').getTime(), NOW)).toBe(
      'updated yesterday 10:30pm',
    );
    expect(formatUpdatedAgo(new Date('2026-10-16T02:00:00Z').getTime(), NOW)).toBe(
      'updated Oct 16, 10:00am',
    );
  });

  it('uses the Manila calendar day, not UTC', () => {
    // 2026-10-18T16:30Z is 00:30 Oct 19 in Manila: today, though UTC says yesterday.
    expect(formatUpdatedAgo(new Date('2026-10-18T16:30:00Z').getTime(), NOW)).toBe(
      'updated today 12:30am',
    );
  });

  it('says never for no timestamp', () => {
    expect(formatUpdatedAgo(null, NOW)).toBe('not updated yet');
  });
});

describe('formatAgo', () => {
  it('reads relative, then the Manila clock', () => {
    expect(formatAgo(ago(20_000), NOW)).toBe('just now');
    expect(formatAgo(ago(2 * 60_000), NOW)).toBe('2 min ago');
    expect(formatAgo(ago(38 * 60_000 + 59_000), NOW)).toBe('38 min ago');
    expect(formatAgo(ago(3 * 3_600_000), NOW)).toBe('3 h ago');
    // 15:12 Manila minus 7 h = 08:12 the same day.
    expect(formatAgo(ago(7 * 3_600_000), NOW)).toBe('today 8:12am');
    expect(formatAgo(ago(20 * 3_600_000), NOW)).toBe('yesterday 7:12pm');
    expect(formatAgo(ago(3 * 86_400_000), NOW)).toBe('Oct 16, 3:12pm');
  });

  it('treats a clock slightly ahead as just now', () => {
    expect(formatAgo(NOW + 3_000, NOW)).toBe('just now');
  });
});

describe('manilaDate', () => {
  it('formats a date in Manila, crossing midnight UTC', () => {
    expect(manilaDate('2026-10-02T17:30:00Z')).toBe('Oct 3, 2026');
    expect(manilaDate('not a date')).toBe('');
  });
});
