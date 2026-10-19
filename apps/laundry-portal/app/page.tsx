'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  peso,
  statusLabel,
  type OrderStatus,
  type OrderView,
} from '@wash-and-go/domain';
import { api, API_BASE_URL } from '../lib/api';
import { c, statusColor, tint } from '../lib/theme';
import { canWeigh, parseWeight } from '../lib/shop';
import {
  formatKg,
  orderEstimateKg,
  readyBlockedReason,
  WEIGH_RANGE_HINT,
  weighCheck,
} from '../lib/weigh';
import { mutationErrorMessage, shouldRefreshQueue, type PortalAction } from '../lib/mutation-errors';

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

// One feedback line per card: the last success, or the last failure (human
// copy only) with a retry when retrying can help. Lives on the card, not the
// button, so it survives the queue refetch that can unmount the button.
type Notice = { tone: 'success' | 'error'; text: string; retry?: () => void };
type SetNotice = (n: Notice | null) => void;

// Shared failure handling for the card's mutations: a 404/409 means the order
// changed under us, so refetch the queue (no retry — it would fail the same
// way); anything else keeps the card as is and offers a retry.
function useFailureNotice(setNotice: SetNotice) {
  const qc = useQueryClient();
  return (action: PortalAction, error: unknown, retry: () => void) => {
    const refresh = shouldRefreshQueue(error);
    if (refresh) qc.invalidateQueries({ queryKey: ['orders'] });
    setNotice({
      tone: 'error',
      text: mutationErrorMessage(action, error),
      retry: refresh ? undefined : retry,
    });
  };
}

function OrderCard({ order: o }: { order: OrderView }) {
  const color = statusColor(o.status);
  const actions = o.availableActions ?? [];
  const [notice, setNotice] = useState<Notice | null>(null);
  // "Mark ready" stays visible but disabled until weighed, with the reason.
  const readyReason = actions.includes('READY_FOR_RETURN')
    ? readyBlockedReason(o, 'READY_FOR_RETURN')
    : null;
  return (
    <div className="card" data-testid={`order-${o.code}`} style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{o.code}</strong>
        <span
          style={{
            color,
            background: tint(color),
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

      {canWeigh(o) && o.shopServiceId ? <WeighForm order={o} setNotice={setNotice} /> : null}

      {actions.length > 0 ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {actions.map((to) => (
            <ActionButton
              key={to}
              order={o}
              to={to}
              blockedReason={readyBlockedReason(o, to)}
              setNotice={setNotice}
            />
          ))}
        </div>
      ) : null}
      {readyReason ? (
        <div style={{ color: c.muted, fontSize: 13, marginTop: 6 }}>{readyReason}</div>
      ) : null}

      {notice ? (
        <div
          role={notice.tone === 'error' ? 'alert' : 'status'}
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginTop: 10,
            fontSize: 13,
            color: notice.tone === 'error' ? c.danger : c.success,
          }}
        >
          <span>{notice.text}</span>
          {notice.retry ? (
            <button
              onClick={notice.retry}
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                border: `1px solid ${c.brand}`,
                background: c.surface,
                color: c.brand,
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function WeighForm({ order, setNotice }: { order: OrderView; setNotice: SetNotice }) {
  const qc = useQueryClient();
  const onFailure = useFailureNotice(setNotice);
  const [input, setInput] = useState('');
  // Keyed by the kg they were made for, so an edit (or a preview that lands
  // after an edit) can never pair a price or a confirm with another weight.
  const [preview, setPreview] = useState<{ kg: number; total: string } | null>(null);
  const [armedKg, setArmedKg] = useState<number | null>(null);
  const v = parseWeight(input);
  const check = v.ok ? weighCheck(v.kg, orderEstimateKg(order)) : null;
  const newTotal = v.ok && preview?.kg === v.kg ? preview.total : null;
  const armed = v.ok && armedKg === v.kg;

  const previewM = useMutation({
    // Same pickup point as the weigh-in, so the previewed total is the one
    // the customer will actually be billed (distance delivery fee included).
    mutationFn: (kg: number) =>
      api.previewOrder({
        shopServiceId: order.shopServiceId!,
        weightKg: kg,
        ...(order.pickupLat != null && order.pickupLng != null
          ? { pickupLat: Number(order.pickupLat), pickupLng: Number(order.pickupLng) }
          : {}),
      }),
    onMutate: () => setNotice(null),
    onSuccess: (b, kg) => setPreview({ kg, total: b.customerTotalPhp }),
    onError: (e, kg) => onFailure('preview', e, () => previewM.mutate(kg)),
  });
  const weighM = useMutation({
    mutationFn: (kg: number) => api.weigh(order.id, kg),
    onMutate: () => setNotice(null),
    onSuccess: (saved, kg) => {
      setInput('');
      setPreview(null);
      setArmedKg(null);
      setNotice({
        tone: 'success',
        text: `Weight saved: ${formatKg(kg)} kg. New total ${peso(saved.customerTotalPhp)}.`,
      });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e, kg) => onFailure('weigh', e, () => weighM.mutate(kg)),
  });

  const onConfirm = () => {
    if (!v.ok) return;
    // Far above the estimate → make the shop confirm the number a second time.
    if (check?.needsSecondConfirm && !armed) setArmedKg(v.kg);
    else weighM.mutate(v.kg);
  };

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
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // A new entry drops the last outcome, so "Try again" can never
              // resend a weight that is no longer in the box.
              setNotice(null);
            }}
            placeholder="Actual kg"
            aria-label="Actual weight in kilograms"
            type="text"
            inputMode="decimal"
            className="field-input"
            style={{ width: 100, fontSize: 16 }}
          />
          <span style={{ fontSize: 16, color: c.muted }}>kg</span>
        </span>
        <button
          disabled={!v.ok || previewM.isPending}
          onClick={() => previewM.mutate(v.kg)}
          style={{
            padding: '7px 12px',
            borderRadius: 8,
            border: `1px solid ${c.brand}`,
            background: c.surface,
            color: c.brand,
            fontWeight: 600,
            opacity: !v.ok ? 0.5 : 1,
          }}
        >
          {previewM.isPending ? 'Pricing…' : 'Preview price'}
        </button>
      </div>
      {input.trim() !== '' && !v.ok ? (
        <div style={{ color: c.danger, fontSize: 13, marginTop: 6 }}>{WEIGH_RANGE_HINT}</div>
      ) : check?.deltaText ? (
        <div
          style={{
            color: check.needsSecondConfirm ? c.warning : c.muted,
            fontSize: 13,
            marginTop: 6,
            fontWeight: check.needsSecondConfirm ? 600 : 400,
          }}
        >
          {check.deltaText}
        </div>
      ) : null}
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
          {armed && check?.confirmPrompt ? (
            <div role="alert" style={{ marginTop: 8 }}>
              <div style={{ color: c.warning, fontSize: 14, fontWeight: 600 }}>
                {check.confirmPrompt}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <button
                  disabled={weighM.isPending}
                  onClick={onConfirm}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: c.brand,
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  {weighM.isPending ? 'Saving…' : `Confirm ${formatKg(v.kg)} kg`}
                </button>
                <button
                  disabled={weighM.isPending}
                  onClick={() => setArmedKg(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: `1px solid ${c.brand}`,
                    background: c.surface,
                    color: c.brand,
                    fontWeight: 600,
                  }}
                >
                  Change weight
                </button>
              </div>
            </div>
          ) : (
            <button
              disabled={weighM.isPending}
              onClick={onConfirm}
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
          )}
        </div>
      ) : null}
    </div>
  );
}

function ActionButton({
  order,
  to,
  blockedReason,
  setNotice,
}: {
  order: OrderView;
  to: OrderStatus;
  blockedReason: string | null;
  setNotice: SetNotice;
}) {
  const qc = useQueryClient();
  const onFailure = useFailureNotice(setNotice);
  const m = useMutation({
    mutationFn: () => api.transition(order.id, to),
    onMutate: () => setNotice(null),
    onSuccess: () => {
      setNotice({ tone: 'success', text: `Marked ${statusLabel(to)}.` });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => onFailure('status', e, () => m.mutate()),
  });
  const disabled = m.isPending || blockedReason != null;
  return (
    <button
      disabled={disabled}
      onClick={() => m.mutate()}
      title={blockedReason ?? undefined}
      style={{
        padding: '8px 14px',
        borderRadius: 8,
        border: 'none',
        background: c.brand,
        color: '#fff',
        fontWeight: 700,
        opacity: blockedReason != null ? 0.5 : 1,
      }}
    >
      {m.isPending ? 'Updating…' : `Mark ${statusLabel(to)}`}
    </button>
  );
}
