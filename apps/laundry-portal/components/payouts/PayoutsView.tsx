'use client';
import { useQuery } from '@tanstack/react-query';
import type { RemittanceBatchView } from '@wash-and-go/domain';
import { Landmark, Wallet } from 'lucide-react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useOnline } from '../../lib/live';
import { batchChip, money, pendingSummary, periodLabel, referenceText, showPayoutNudge } from '../../lib/payouts';
import { shopMeKey } from '../../lib/shop-profile';
import { useConsole } from '../console/ConsoleContext';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Skeleton, SkeletonCard } from '../ui/Skeleton';
import { StaleBanner } from '../ui/StaleBanner';
import s from './payouts.module.css';

// Payouts change at most when ops closes or pays a period, so they poll once
// a minute (well inside the API's 60/min budget beside the queue's poll).
const PAYOUT_POLL = { refetchInterval: 60_000 } as const;
export const REMITTANCE_KEY = ['shop-remittance'] as const;

// /payouts (plan A4, preview B7): what is owed and not yet batched, then the
// batches, a table from 560px and cards below.
export function PayoutsView() {
  const online = useOnline();
  const { me } = useConsole();
  // Same query as the Shop page; only owners can hold a payout account.
  const profile = useQuery({
    queryKey: shopMeKey(me.id),
    queryFn: () => api.shopMe(),
    enabled: me.roles.includes('SHOP_OWNER'),
    refetchInterval: false,
  });
  const pending = useQuery({
    queryKey: [...REMITTANCE_KEY, 'pending'],
    queryFn: () => api.shopRemittancePending(),
    ...PAYOUT_POLL,
  });
  const batches = useQuery({
    queryKey: REMITTANCE_KEY,
    queryFn: () => api.getShopRemittance(),
    ...PAYOUT_POLL,
  });
  const rows = batches.data ?? [];
  const failedWithData =
    online && ((pending.isError && pending.data) || (batches.isError && batches.data));

  return (
    <section className={s.page} data-testid="payouts">
      <h1 className="disp">Payouts</h1>
      {failedWithData ? (
        <StaleBanner
          message="Couldn't refresh. Showing what we last saw."
          onRetry={() => {
            void pending.refetch();
            void batches.refetch();
          }}
        />
      ) : null}

      {pending.data ? (
        <div className={s.pending} data-testid="payouts-pending">
          <div className="lbl">Pending · not yet batched</div>
          <div className={s.hero}>{money(pending.data.totalPhp)}</div>
          <div className="small">{pendingSummary(pending.data)}</div>
        </div>
      ) : pending.isLoading ? (
        <div className="card card-pad" aria-busy="true">
          <span className="sr-only">Loading the pending payout</span>
          <Skeleton width="40%" />
          <Skeleton width="60%" height={44} />
          <Skeleton width="70%" />
        </div>
      ) : (
        <ErrorState title="The pending payout didn't load." onRetry={() => void pending.refetch()} />
      )}
      <p className={s.note}>Paid out per period by Wash &amp; Go ops; the reference shows here once sent.</p>

      {showPayoutNudge(profile.data) ? (
        <Card className={s.nudge} data-testid="payout-nudge">
          <Landmark aria-hidden="true" />
          <div>
            <b>Add a payout account so ops can send your payouts.</b>
            <Link href="/shop" className="btn btn-secondary">
              Add a payout account
            </Link>
          </div>
        </Card>
      ) : null}

      <h2 className="lbl">Batches</h2>
      {batches.isLoading ? (
        <>
          <SkeletonCard label="Loading payout batches" />
          <SkeletonCard label="Loading payout batches" />
        </>
      ) : batches.isError && !batches.data ? (
        <ErrorState title="Payouts didn't load." onRetry={() => void batches.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payouts yet."
          body="Delivered orders appear here after the first period closes."
        />
      ) : (
        <BatchList rows={rows} />
      )}
    </section>
  );
}

function BatchList({ rows }: { rows: RemittanceBatchView[] }) {
  return (
    <>
      <div className={`card ${s.table}`}>
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th className={s.num}>Orders</th>
              <th className={s.num}>Amount</th>
              <th>Status</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} data-testid={`batch-${b.id}`}>
                <td>
                  <Link href={`/payouts/${b.id}`} className={s.period}>
                    {periodLabel(b)}
                  </Link>
                </td>
                <td className={s.num}>{b.lineCount}</td>
                <td className={s.num}>{money(b.totalPhp)}</td>
                <td>
                  <Chip spec={batchChip(b.status)} />
                </td>
                <td className={b.reference ? s.mono : 'muted'}>{referenceText(b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={s.cards}>
        {rows.map((b) => (
          <Link key={b.id} href={`/payouts/${b.id}`} className={`card card-pad ${s.batch}`} data-testid={`batch-card-${b.id}`}>
            <span className={s.period}>{periodLabel(b)}</span>
            <Chip spec={batchChip(b.status)} />
            <span className="small muted">
              {b.lineCount} order{b.lineCount === 1 ? '' : 's'}
            </span>
            <span className={s.amount}>{money(b.totalPhp)}</span>
            <span className={`small muted ${s.ref}`}>
              {b.reference ? (
                <>
                  Ref <span className={s.mono}>{b.reference}</span>
                </>
              ) : (
                referenceText(b)
              )}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
