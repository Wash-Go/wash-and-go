'use client';
import { useQuery } from '@tanstack/react-query';
import { peso } from '@wash-and-go/domain';
import { Wallet } from 'lucide-react';
import { Chip } from '../../../components/ui/Chip';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { api } from '../../../lib/api';
import { PORTAL_CHIPS } from '../../../lib/status-chip';
import { c } from '../../../lib/theme';

// The payout batches list that used to sit under the queue on /. B5 replaces
// this page with pending totals, batch detail and CSV export.
export default function PayoutsPage() {
  const batches = useQuery({
    queryKey: ['shop-remittance'],
    queryFn: () => api.getShopRemittance(),
  });
  const rows = batches.data ?? [];

  return (
    <section data-testid="payouts">
      <h1 className="disp">Payouts</h1>
      <p className="page-sub" style={{ marginBottom: 16 }}>
        What the platform owes your shop and whether it’s been transferred.
      </p>
      {batches.isLoading ? (
        <p style={{ color: c.muted }}>Loading payouts…</p>
      ) : batches.isError && !batches.data ? (
        <ErrorState title="Payouts didn't load." onRetry={() => void batches.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payout batches yet."
          body="They appear here after the weekly close, with the amount and the transfer reference."
        />
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Orders</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} data-testid={`batch-${b.id}`}>
                  <td>
                    {new Date(b.periodStart).toLocaleDateString()} –{' '}
                    {new Date(b.periodEnd).toLocaleDateString()}
                  </td>
                  <td>{b.lineCount}</td>
                  <td className="tnum">{peso(b.totalPhp)}</td>
                  <td>
                    <Chip spec={b.status === 'PAID' ? PORTAL_CHIPS.PAID : PORTAL_CHIPS.TRANSFER_PENDING} />
                  </td>
                  <td style={{ color: c.muted }}>{b.reference ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="small muted" style={{ marginTop: 16 }}>
        Pending totals, batch detail per order and CSV export are coming in B5.
      </p>
    </section>
  );
}
