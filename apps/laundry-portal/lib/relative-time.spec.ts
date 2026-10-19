import { formatUpdatedAgo, manilaClock } from './relative-time';

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
