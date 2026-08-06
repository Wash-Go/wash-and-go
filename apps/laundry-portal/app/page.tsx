'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  peso,
  statusLabel,
  type OrderStatus,
  type OrderView,
} from '@wash-and-go/domain';
import { api, API_BASE_URL } from '../lib/api';
import { c, statusColor } from '../lib/theme';
import { canWeigh, parseWeight } from '../lib/shop';

export default function ShopPage() {
  const orders = useQuery({ queryKey: ['orders'], queryFn: () => api.listOrders() });

  return (
    <>
      <div className="page-head">
        <div className="page-eyebrow">Queue</div>
        <h1>Orders</h1>
        <p className="page-sub">
          Weigh a picked-up load to set its final price, then drive it through the
          shop steps.
        </p>
      </div>

      {orders.isLoading ? (
        <p style={{ color: c.muted }}>Loading queue…</p>
      ) : orders.isError ? (
        <p style={{ color: c.danger }}>
          Could not load. Is the API running on {API_BASE_URL}?
        </p>
      ) : (orders.data ?? []).length === 0 ? (
        <p style={{ color: c.muted }}>No orders in your queue.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.data!.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}

      <Payouts />
    </>
  );
}

function Payouts() {
  const batches = useQuery({
    queryKey: ['shop-remittance'],
    queryFn: () => api.getShopRemittance(),
  });
  const rows = batches.data ?? [];

  return (
    <section style={{ marginTop: 40 }} data-testid="payouts">
      <div className="page-head" style={{ marginBottom: 12 }}>
        <div className="page-eyebrow">Payouts</div>
        <h2 style={{ margin: 0 }}>Your payout batches</h2>
        <p className="page-sub">What the platform owes your shop and whether it’s been transferred.</p>
      </div>
      {batches.isLoading ? (
        <p style={{ color: c.muted }}>Loading payouts…</p>
      ) : batches.isError ? (
        <p style={{ color: c.danger }}>Could not load payouts.</p>
      ) : rows.length === 0 ? (
        <p style={{ color: c.muted }}>No payout batches yet. They appear after a weekly close.</p>
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
                    <span
                      style={{
                        color: b.status === 'PAID' ? c.success : c.warning,
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      {b.status === 'PAID' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td style={{ color: c.muted }}>{b.reference ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function OrderCard({ order: o }: { order: OrderView }) {
  const color = statusColor(o.status);
  const actions = o.availableActions ?? [];
  return (
    <div className="card" data-testid={`order-${o.code}`} style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{o.code}</strong>
        <span
          style={{
            color,
            background: color + '1A',
            padding: '3px 10px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {statusLabel(o.status)}
        </span>
      </div>
      <div style={{ color: c.muted, fontSize: 13, marginTop: 4 }}>{o.pickupAddress}</div>
      <div style={{ fontSize: 14, marginTop: 6 }}>
        {o.weightKg != null ? `Weighed ${o.weightKg}kg` : `Est ~${o.weightEstimateKg}kg`} ·{' '}
        <strong className="tnum">{peso(o.customerTotalPhp)}</strong>
      </div>

      {canWeigh(o) && o.shopServiceId ? <WeighForm order={o} /> : null}

      {actions.length > 0 ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {actions.map((to) => (
            <ActionButton key={to} order={o} to={to} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WeighForm({ order }: { order: OrderView }) {
  const qc = useQueryClient();
  const [input, setInput] = useState('');
  const [newTotal, setNewTotal] = useState<string | null>(null);
  const v = parseWeight(input);

  // Any edit invalidates a stale preview.
  useEffect(() => {
    setNewTotal(null);
  }, [input]);

  const previewM = useMutation({
    mutationFn: () => api.previewOrder({ shopServiceId: order.shopServiceId!, weightKg: v.kg }),
    onSuccess: (b) => setNewTotal(b.customerTotalPhp),
  });
  const weighM = useMutation({
    mutationFn: () => api.weigh(order.id, v.kg),
    onSuccess: () => {
      setInput('');
      setNewTotal(null);
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        background: c.surface2,
        borderRadius: 10,
        border: `1px solid ${c.border}`,
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Actual kg"
          inputMode="decimal"
          className="field-input"
          style={{ width: 100 }}
        />
        <button
          disabled={!v.ok || previewM.isPending}
          onClick={() => previewM.mutate()}
          style={{
            padding: '7px 12px',
            borderRadius: 8,
            border: `1px solid ${c.brand}`,
            background: c.surface,
            color: c.brand,
            fontWeight: 600,
          }}
        >
          {previewM.isPending ? '…' : 'Preview price'}
        </button>
      </div>
      {newTotal ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 14 }}>
            was{' '}
            <s className="tnum" style={{ color: c.muted }}>
              {peso(order.customerTotalPhp)}
            </s>{' '}
            → now{' '}
            <strong className="tnum" style={{ color: c.brand }}>
              {peso(newTotal)}
            </strong>
          </div>
          <button
            disabled={weighM.isPending}
            onClick={() => weighM.mutate()}
            style={{
              marginTop: 8,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: c.brand,
              color: '#fff',
              fontWeight: 700,
            }}
          >
            {weighM.isPending ? 'Saving…' : 'Confirm weigh-in'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ActionButton({ order, to }: { order: OrderView; to: OrderStatus }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => api.transition(order.id, to),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
  return (
    <button
      disabled={m.isPending}
      onClick={() => m.mutate()}
      style={{
        padding: '8px 14px',
        borderRadius: 8,
        border: 'none',
        background: c.brand,
        color: '#fff',
        fontWeight: 700,
      }}
    >
      {m.isPending ? '…' : `Mark ${statusLabel(to)}`}
    </button>
  );
}
