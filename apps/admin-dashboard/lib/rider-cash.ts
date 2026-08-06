import type { RiderCashBalance } from '@wash-and-go/domain';

// Total cash still owed to the platform across all riders. Sum in centavos to
// avoid float drift, then format.
export function totalOutstandingPhp(rows: RiderCashBalance[]): string {
  const centavos = rows.reduce(
    (acc, r) => acc + Math.round(Number(r.outstandingPhp) * 100),
    0,
  );
  return (centavos / 100).toFixed(2);
}

// Riders who still owe money (outstanding > 0), most owed first.
export function owing(rows: RiderCashBalance[]): RiderCashBalance[] {
  return rows
    .filter((r) => Number(r.outstandingPhp) > 0)
    .sort((a, b) => Number(b.outstandingPhp) - Number(a.outstandingPhp));
}
