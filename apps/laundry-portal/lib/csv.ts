import type { RemittanceBatchDetailView } from '@wash-and-go/domain';
import { periodDays } from './payouts';

// CSV export of a payout batch, built in the browser from the lines the
// detail screen already has (RFC 4180: comma-separated, CRLF, fields with a
// comma, quote or line break quoted, inner quotes doubled). Money is written
// as plain two-decimal numbers so a spreadsheet can sum it.

// A text cell starting with = + @ (or tab / CR) runs as a formula in Excel and
// Sheets; prefix it with ' so it stays text.
const FORMULA = /^[=+@\t\r]/;

export function csvCell(v: string | number | null | undefined): string {
  if (v == null) return '';
  let s = String(v);
  if (FORMULA.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

const plain = (amount: string) => Number(amount).toFixed(2);

const stamp = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// "2026-10-07 11:10" in Manila.
function manilaStamp(iso: string): string {
  const p = Object.fromEntries(stamp.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

export function payoutCsv(b: Pick<RemittanceBatchDetailView, 'lines'>): string {
  return toCsv([
    ['Order code', 'Delivered (Manila)', 'Wash value (PHP)', 'Commission (PHP)', 'Payout (PHP)'],
    ...b.lines.map((l) => [
      l.orderCode,
      l.deliveredAt ? manilaStamp(l.deliveredAt) : '',
      plain(l.washValuePhp),
      plain(l.commissionPhp),
      plain(l.payoutPhp),
    ]),
  ]);
}

// payout-<first day>-<last day>.csv, the period's days in Manila.
export function payoutCsvName(b: Pick<RemittanceBatchDetailView, 'periodStart' | 'periodEnd'>): string {
  const { first, last } = periodDays(b);
  return `payout-${first}-${last}.csv`;
}
