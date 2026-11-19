'use client';
import { useQuery } from '@tanstack/react-query';
import type { RemittanceBatchDetailView } from '@wash-and-go/domain';
import { ChevronLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { payoutCsv, payoutCsvName } from '../../lib/csv';
import { batchChip, batchTotals, money, periodLabel } from '../../lib/payouts';
import { manilaClock } from '../../lib/relative-time';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { ErrorState } from '../ui/ErrorState';
import { Skeleton } from '../ui/Skeleton';
import { REMITTANCE_KEY } from './PayoutsView';
import s from './payouts.module.css';

const monthDay = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' });
const when = (iso: string | null) => (iso ? `${monthDay.format(new Date(iso))}, ${manilaClock(new Date(iso))}` : '—');

function statusOf(e: unknown): number | undefined {
  const v = (e as { status?: unknown } | null)?.status;
  return typeof v === 'number' ? v : undefined;
}

// Client-side CSV download from the lines already on screen.
function download(b: RemittanceBatchDetailView) {
  const url = URL.createObjectURL(new Blob([payoutCsv(b)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = payoutCsvName(b);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// /payouts/[id] (preview C2): period, status, reference, totals, one line per
// delivered order (table from 560px, cards below) and the CSV export.
export function BatchDetail({ id }: { id: string }) {
  const q = useQuery({
    queryKey: [...REMITTANCE_KEY, 'batch', id],
    queryFn: () => api.shopRemittanceBatch(id),
    refetchInterval: 60_000,
    retry: (n, e) => statusOf(e) !== 404 && statusOf(e) !== 403 && n < 2,
  });

  const back = (
    <Link className="back" href="/payouts">
      <ChevronLeft aria-hidden="true" />
      Payouts
    </Link>
  );

  if (q.data === undefined && q.isLoading) {
    return (
      <div className={s.page} aria-busy="true">
        {back}
        <span className="sr-only">Loading the batch</span>
        <Skeleton width="50%" height={28} />
        <Skeleton height={80} style={{ borderRadius: 'var(--r-lg)' }} />
        <Skeleton height={200} style={{ borderRadius: 'var(--r-lg)' }} />
      </div>
    );
  }
  if (q.data === undefined) {
    const nf = statusOf(q.error) === 404 || statusOf(q.error) === 403;
    return (
      <div className={s.page}>
        <ErrorState
          title={nf ? 'Batch not found' : "This batch didn't load."}
          body={nf ? 'It may belong to another shop, or the link is wrong.' : 'Check your connection, then try again.'}
          onRetry={nf ? undefined : () => void q.refetch()}
          backHref="/payouts"
          backLabel="Back to payouts"
        />
      </div>
    );
  }

  const b = q.data;
  const totals = batchTotals(b.lines);
  const label = periodLabel(b);
  const statusNote =
    b.status === 'PAID'
      ? `Paid ${b.paidAt ? monthDay.format(new Date(b.paidAt)) : ''}${b.reference ? ' · ' : ''}`
      : `Closed ${monthDay.format(new Date(b.createdAt))} · reference appears once ops sends it`;

  return (
    <section className={s.page} data-testid="payout-batch">
      {back}
      <div className={s.head}>
        <h1 className="disp">Batch {label}</h1>
        <Button variant="secondary" icon={<Download aria-hidden="true" />} onClick={() => download(b)}>
          Download CSV
        </Button>
      </div>

      <div className={`card card-pad ${s.summary}`}>
        <div>
          <div className="lbl">Orders</div>
          <div className={s.v}>{b.lineCount}</div>
        </div>
        <div>
          <div className="lbl">Wash value</div>
          <div className={s.v}>{money(totals.washValuePhp)}</div>
        </div>
        <div>
          <div className="lbl">Commission</div>
          <div className={s.v}>{money(totals.commissionPhp)}</div>
        </div>
        <div>
          <div className="lbl">Your payout</div>
          <div className={s.v} data-testid="batch-total">
            {money(b.totalPhp)}
          </div>
        </div>
        <div className={s.status}>
          <Chip spec={batchChip(b.status)} />
          <div className="small muted" style={{ marginTop: 6 }}>
            {statusNote}
            {b.status === 'PAID' && b.reference ? (
              <>
                Ref <span className={s.mono}>{b.reference}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className={`card ${s.table}`}>
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Delivered</th>
              <th className={s.num}>Wash value</th>
              <th className={s.num}>Commission</th>
              <th className={s.num}>Payout</th>
            </tr>
          </thead>
          <tbody>
            {b.lines.map((l) => (
              <tr key={l.id} data-testid={`line-${l.orderCode}`}>
                <td>
                  <Link href={`/orders/${l.orderId}`} className={s.mono}>
                    {l.orderCode}
                  </Link>
                </td>
                <td className={s.mono}>{when(l.deliveredAt)}</td>
                <td className={s.num}>{money(l.washValuePhp)}</td>
                <td className={s.num}>{money(l.commissionPhp)}</td>
                <td className={s.num}>{money(l.payoutPhp)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>
                {b.lines.length} order{b.lines.length === 1 ? '' : 's'}
              </td>
              <td className={s.num}>{money(totals.washValuePhp)}</td>
              <td className={s.num}>{money(totals.commissionPhp)}</td>
              <td className={s.num}>{money(totals.payoutPhp)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className={s.cards}>
        {b.lines.map((l) => (
          <div key={l.id} className={`card card-pad ${s.line}`}>
            <Link href={`/orders/${l.orderId}`} className={s.code}>
              {l.orderCode}
            </Link>
            <span className={`small muted ${s.mono}`}>{when(l.deliveredAt)}</span>
            <dl>
              <div>
                <dt>Wash value</dt>
                <dd>{money(l.washValuePhp)}</dd>
              </div>
              <div>
                <dt>Commission</dt>
                <dd>{money(l.commissionPhp)}</dd>
              </div>
              <div className={s.payout}>
                <dt>Payout</dt>
                <dd>{money(l.payoutPhp)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
