'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  peso,
  statusLabel,
  type OrderStatus,
  type OrderView,
  type Rider,
} from '@wash-and-go/domain';
import { api, API_BASE_URL } from '../lib/api';
import { c, statusColor } from '../lib/theme';
import { STATUS_FILTERS, canAssign, filterOrders } from '../lib/orders';

export default function AdminPage() {
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const orders = useQuery({ queryKey: ['orders'], queryFn: () => api.listOrders() });
  const riders = useQuery({ queryKey: ['riders'], queryFn: () => api.getRiders() });

  const rows = orders.data ? filterOrders(orders.data, filter) : [];

  return (
    <>
      <div className="page-head">
        <div className="page-eyebrow">Operations</div>
        <h1>Dispatch</h1>
        <p className="page-sub">
          Live order board. Assign a rider when auto-match falls through — the
          exception path, not routine dispatch.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '6px 10px',
              borderRadius: 999,
              border: `1px solid ${filter === s ? c.brand : c.border}`,
              background: filter === s ? c.brand : c.surface,
              color: filter === s ? '#fff' : c.text,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {s === 'ALL' ? 'All' : statusLabel(s)}
          </button>
        ))}
      </div>

      {orders.isLoading ? (
        <p style={{ color: c.muted }}>Loading orders…</p>
      ) : orders.isError ? (
        <p style={{ color: c.danger }}>
          Could not load orders. Is the API running on {API_BASE_URL}?
        </p>
      ) : rows.length === 0 ? (
        <p style={{ color: c.muted }}>No orders in this view.</p>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Pickup</th>
                <th>Status</th>
                <th>Rider</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600 }}>{o.code}</td>
                  <td style={{ color: c.muted }}>{o.pickupAddress}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td>{o.rider?.displayName ?? '—'}</td>
                  <td className="tnum">{peso(o.customerTotalPhp)}</td>
                  <td>
                    {canAssign(o) ? (
                      <AssignCell order={o} riders={riders.data ?? []} />
                    ) : (
                      <span style={{ color: c.muted, fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const color = statusColor(status);
  return (
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
      {statusLabel(status)}
    </span>
  );
}

function AssignCell({ order, riders }: { order: OrderView; riders: Rider[] }) {
  const qc = useQueryClient();
  const [riderId, setRiderId] = useState('');
  const m = useMutation({
    mutationFn: () => api.assignRider(order.id, riderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select value={riderId} onChange={(e) => setRiderId(e.target.value)}>
        <option value="">Pick rider…</option>
        {riders.map((r) => (
          <option key={r.id} value={r.id}>
            {r.displayName}
          </option>
        ))}
      </select>
      <button
        disabled={!riderId || m.isPending}
        onClick={() => m.mutate()}
        style={{
          padding: '6px 14px',
          borderRadius: 8,
          border: 'none',
          background: c.brand,
          color: '#fff',
          fontWeight: 700,
        }}
      >
        {m.isPending ? '…' : 'Assign'}
      </button>
      {m.isError ? <span style={{ color: c.danger, fontSize: 12 }}>failed</span> : null}
    </div>
  );
}
