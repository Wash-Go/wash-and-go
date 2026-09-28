// Last full week [Mon 00:00Z, next Mon 00:00Z) as of `now` — the default close
// period. Computed in UTC so it's deterministic regardless of the runner's
// timezone; the admin can adjust the range in the UI. ISO strings the API's
// @IsISO8601 accepts.
export function lastWeekPeriod(now: Date): { periodStart: string; periodEnd: string } {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  const thisMonday = new Date(d);
  thisMonday.setUTCDate(d.getUTCDate() - dow);
  const lastMonday = new Date(thisMonday);
  lastMonday.setUTCDate(thisMonday.getUTCDate() - 7);
  return {
    periodStart: lastMonday.toISOString(),
    periodEnd: thisMonday.toISOString(),
  };
}
