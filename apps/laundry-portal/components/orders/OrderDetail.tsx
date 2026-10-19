'use client';
import { useQuery } from '@tanstack/react-query';
import { peso, type OrderView } from '@wash-and-go/domain';
import { Bike, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { backHref, orderTimeline, payoutPhp, weighHistory } from '../../lib/order-detail';
import { orderDetailKey } from '../../lib/order-queries';
import { firstName, loadLabel, primaryAction, serviceLabel, shortName } from '../../lib/queue';
import { manilaClock } from '../../lib/relative-time';
import { canWeigh } from '../../lib/shop';
import { formatKg, washLine } from '../../lib/weigh';
import { Button } from '../ui/Button';
import { OrderChip } from '../ui/Chip';
import { ErrorState } from '../ui/ErrorState';
import { Skeleton } from '../ui/Skeleton';
import { Breakdown } from './Breakdown';
import { StatusAction } from './StatusAction';

function statusOf(e: unknown): number | undefined {
  const s = (e as { status?: unknown } | null)?.status;
  return typeof s === 'number' ? s : undefined;
}

// When the order records a time: "10:42am", or "Oct 3, 10:42am" on another day.
function stamp(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const day = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  if (day(d) === day(new Date())) return manilaClock(d);
  return `${d.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' })}, ${manilaClock(d)}`;
}

// Order detail (plan A4, preview B4): who has it, the trail, the money, the
// weigh history and the same single action as the card. Used by the
// /orders/[id] route and, from 1024 px, inside the queue's side panel.
export function OrderDetail({
  id,
  onWeigh,
  inPanel,
}: {
  id: string;
  onWeigh: (o: OrderView) => void;
  inPanel?: boolean;
}) {
  const q = useQuery({
    queryKey: orderDetailKey(id),
    queryFn: () => api.getOrder(id),
    // Not found / not yours will not change on a retry.
    retry: (n, e) => statusOf(e) !== 404 && statusOf(e) !== 403 && n < 2,
  });

  if (q.data === undefined && q.isLoading) {
    return (
      <div className="detail" aria-busy="true" data-testid="order-detail-loading">
        <span className="sr-only">Loading the order</span>
        <Skeleton width="40%" height={28} />
        <Skeleton width="70%" />
        <Skeleton height={180} style={{ borderRadius: 'var(--r-lg)' }} />
        <Skeleton height={140} style={{ borderRadius: 'var(--r-lg)' }} />
      </div>
    );
  }
  if (q.data === undefined) {
    const s = statusOf(q.error);
    return s === 404 || s === 403 ? (
      <ErrorState
        title="Order not found"
        body="It may have been cancelled, or it belongs to another shop."
        backHref="/"
        backLabel="Back to orders"
      />
    ) : (
      <ErrorState
        title="This order didn't load."
        body="Check your connection, then try again."
        onRetry={() => void q.refetch()}
        backHref="/"
        backLabel="Back to orders"
      />
    );
  }

  const o = q.data;
  const name = firstName(o.customer?.displayName);
  const payout = payoutPhp(o);
  const kg = o.weightKg != null ? Number(o.weightKg) : null;
  const action = primaryAction(o);
  const reweigh = canWeigh(o) && o.weightKg != null && o.shopServiceId != null;

  return (
    <div className="detail" data-testid="order-detail">
      {inPanel ? null : (
        <Link className="back" href={backHref(o)}>
          <ChevronLeft aria-hidden="true" />
          Orders
        </Link>
      )}
      {inPanel ? null : <h1 className="sr-only">Order details</h1>}
      <div className="oc-h">
        <div className="oc-code">
          {o.code.slice(-4)}
          <small>{[o.code, name, serviceLabel(o.serviceType)].filter(Boolean).join(' · ')}</small>
        </div>
        <OrderChip status={o.status} />
      </div>

      {o.rider ? (
        <div className="who">
          <Bike aria-hidden="true" />
          <span>
            Rider <b>{shortName(o.rider.displayName)}</b>
          </span>
        </div>
      ) : null}

      <section className="card card-pad" aria-labelledby={`trail-${o.id}`}>
        <h2 id={`trail-${o.id}`} className="lbl">
          Trail
        </h2>
        <ol className="tl">
          {orderTimeline(o).map((s) => (
            <li key={s.status} className={s.state} aria-current={s.state === 'now' ? 'step' : undefined}>
              <span>{s.state === 'now' ? <b>{s.label}</b> : s.label}</span>
              <time dateTime={s.at ?? undefined}>{stamp(s.at)}</time>
            </li>
          ))}
        </ol>
      </section>

      <section className="card card-pad" aria-labelledby={`money-${o.id}`}>
        <h2 id={`money-${o.id}`} className="lbl">
          {kg != null ? 'Price' : 'Price at booking'}
        </h2>
        <Breakdown
          wash={kg != null ? washLine(kg, o.washValuePhp) : (loadLabel(o) ?? 'estimate')}
          washValuePhp={o.washValuePhp}
          deliveryFeePhp={o.deliveryFeePhp}
          serviceFeePhp={o.serviceFeePhp}
          customerTotalPhp={o.customerTotalPhp}
          extra={
            payout != null ? (
              <div className="payout" data-testid="payout-line">
                <dt>{kg != null ? 'Your payout' : 'Your payout (estimate)'}</dt>
                <dd>{peso(payout)}</dd>
              </div>
            ) : null
          }
        />
      </section>

      <div className="small muted weigh-history">
        <span>
          <b className="ink">Weigh-in</b> {weighHistory(o)}
          {kg != null ? <span className="sr-only"> ({formatKg(kg)} kg)</span> : null}
        </span>
        {reweigh ? (
          <Button variant="text" onClick={() => onWeigh(o)}>
            Change the weight
          </Button>
        ) : null}
      </div>

      {action ? (
        <div className={inPanel ? 'detail-action' : 'detail-action sticky-action'}>
          <StatusAction order={o} onWeigh={onWeigh} full />
        </div>
      ) : null}
    </div>
  );
}
