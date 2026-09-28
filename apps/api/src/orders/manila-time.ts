/*
 * Asia/Manila day bucketing (finding T2). Manila is a fixed UTC+8 offset with
 * no DST, so the window is computed arithmetically — no tz database needed. The
 * capacity count buckets EXPRESS orders by the Manila calendar day.
 */

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

export interface ManilaDayWindow {
  dateStr: string; // 'YYYY-MM-DD' in Manila — the advisory-lock key component
  dayStartUtc: Date; // inclusive lower bound (UTC instant of Manila local midnight)
  dayEndUtc: Date; // exclusive upper bound (next Manila midnight)
}

export function manilaDayWindow(now: Date): ManilaDayWindow {
  // Shift into Manila local time, then read the calendar date off the UTC parts.
  const local = new Date(now.getTime() + MANILA_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();

  const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  // Manila local midnight, expressed as a UTC instant.
  const dayStartUtc = new Date(Date.UTC(y, m, d) - MANILA_OFFSET_MS);
  const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000);

  return { dateStr, dayStartUtc, dayEndUtc };
}
