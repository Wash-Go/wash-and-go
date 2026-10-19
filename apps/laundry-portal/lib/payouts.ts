import {
  peso,
  type RemittanceBatchStatus,
  type RemittanceBatchView,
  type RemittanceLineView,
  type RemittancePendingView,
} from '@wash-and-go/domain';
import { PORTAL_CHIPS, type ChipSpec } from './status-chip';

// Payouts (plan A4, preview B7 / C2). Pure helpers: money, the batch period,
// the pending line and batch totals. Dates are read in Asia/Manila.

const TZ = 'Asia/Manila';
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const monthDay = new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric' });
const dayOnly = new Intl.DateTimeFormat('en-US', { timeZone: TZ, day: 'numeric' });
const yearOf = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric' });

// ₱1,234.50 — the API sends 2dp strings, but never assume it.
export function money(amount: string | number): string {
  return peso(Number(amount));
}

export function manilaDay(iso: string | number | Date): string {
  return dayKey.format(new Date(iso));
}

// A batch covers [periodStart, periodEnd): the last day is the day just
// before the (exclusive) end.
export function periodDays(b: Pick<RemittanceBatchView, 'periodStart' | 'periodEnd'>): { first: string; last: string } {
  const end = new Date(b.periodEnd).getTime() - 1;
  return { first: manilaDay(b.periodStart), last: manilaDay(end) };
}

// "Oct 6 – 12", "Sep 29 – Oct 5", "Dec 29, 2025 – Jan 4, 2026", "Oct 6".
export function periodLabel(b: Pick<RemittanceBatchView, 'periodStart' | 'periodEnd'>): string {
  const start = new Date(b.periodStart);
  const end = new Date(new Date(b.periodEnd).getTime() - 1);
  const { first, last } = periodDays(b);
  if (first === last) return monthDay.format(start);
  if (first.slice(0, 4) !== last.slice(0, 4)) {
    return `${monthDay.format(start)}, ${yearOf.format(start)} – ${monthDay.format(end)}, ${yearOf.format(end)}`;
  }
  if (first.slice(0, 7) === last.slice(0, 7)) return `${monthDay.format(start)} – ${dayOnly.format(end)}`;
  return `${monthDay.format(start)} – ${monthDay.format(end)}`;
}

export function pendingSummary(p: RemittancePendingView): string {
  if (p.lineCount === 0) return 'Nothing waiting: every delivered order is in a batch';
  return `${p.lineCount} delivered order${p.lineCount === 1 ? '' : 's'} not yet batched`;
}

export function batchChip(status: RemittanceBatchStatus): ChipSpec {
  return status === 'PAID' ? PORTAL_CHIPS.PAID : PORTAL_CHIPS.TRANSFER_PENDING;
}

export function referenceText(b: Pick<RemittanceBatchView, 'reference'>): string {
  return b.reference ?? 'Reference added when ops sends it';
}

// Totals row for the lines table, summed in centavos (no float drift).
export function batchTotals(
  lines: Pick<RemittanceLineView, 'washValuePhp' | 'commissionPhp' | 'payoutPhp'>[],
): { washValuePhp: string; commissionPhp: string; payoutPhp: string } {
  const sum = (k: 'washValuePhp' | 'commissionPhp' | 'payoutPhp') =>
    (lines.reduce((acc, l) => acc + Math.round(Number(l[k]) * 100), 0) / 100).toFixed(2);
  return { washValuePhp: sum('washValuePhp'), commissionPhp: sum('commissionPhp'), payoutPhp: sum('payoutPhp') };
}
