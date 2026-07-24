import type { RemittanceBatchView } from '@wash-and-go/domain';

// Sum the payout still owed (PENDING batches). Money is stringified Decimal, so
// sum in centavos to avoid float drift, then format back.
export function pendingTotalPhp(batches: RemittanceBatchView[]): string {
  const centavos = batches
    .filter((b) => b.status === 'PENDING')
    .reduce((acc, b) => acc + Math.round(Number(b.totalPhp) * 100), 0);
  return (centavos / 100).toFixed(2);
}

export function countByStatus(batches: RemittanceBatchView[]): {
  pending: number;
  paid: number;
} {
  let pending = 0;
  let paid = 0;
  for (const b of batches) {
    if (b.status === 'PAID') paid += 1;
    else pending += 1;
  }
  return { pending, paid };
}

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
