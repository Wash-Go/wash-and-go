'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { peso, type RemittanceBatchView } from '@wash-and-go/domain';
import { api, API_BASE_URL } from '../../lib/api';
import { c } from '../../lib/theme';
import { countByStatus, lastWeekPeriod, pendingTotalPhp } from '../../lib/remittance';

type StatusFilter = 'ALL' | 'PENDING' | 'PAID';

export default function RemittancePage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [toast, setToast] = useState<string | null>(null);

  const batches = useQuery({
    queryKey: ['remittance', filter],
    queryFn: () =>
      api.getRemittanceBatches(filter === 'ALL' ? undefined : { status: filter }),
  });

  const rows = batches.data ?? [];
  const summary = useMemo(() => countByStatus(rows), [rows]);
  const owed = useMemo(() => pendingTotalPhp(rows), [rows]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  const close = useMutation({
    mutationFn: () => api.closeRemittance(lastWeekPeriod(new Date())),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['remittance'] });
      flash(
        created.length > 0
          ? `Closed ${created.length} batch${created.length > 1 ? 'es' : ''}`
          : 'No unbatched payouts in that period',
      );
    },
  });

  return (
    <>
      <div className="page-head">
        <div className="page-eyebrow">Finance</div>
        <h1>Shop payouts</h1>
        <p className="page-sub">
          Each delivered order records a payout line. Close a week to batch what
          each shop is owed, then mark a batch paid with the transfer reference.
          Transfers are made externally.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <Stat label="Owed (pending)" value={peso(owed)} accent />
        <Stat label="Pending batches" value={String(summary.pending)} />
        <Stat label="Paid batches" value={String(summary.paid)} />
        <button
          onClick={() => close.mutate()}
          disabled={close.isPending}
          style={{
            marginLeft: 'auto',
            alignSelf: 'center',
            padding: '10px 18px',
            borderRadius: 9,
            border: 'none',
            background: c.brand,
            color: '#fff',
            fontWeight: 700,
          }}
        >
          {close.isPending ? 'Closing…' : 'Close last week'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['ALL', 'PENDING', 'PAID'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: `1px solid ${filter === s ? c.brand : c.border}`,
              background: filter === s ? c.brand : c.surface,
              color: filter === s ? '#fff' : c.text,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {s === 'ALL' ? 'All' : s === 'PENDING' ? 'Pending' : 'Paid'}
          </button>
        ))}
      </div>

      {batches.isLoading ? (
        <p style={{ color: c.muted }}>Loading…</p>
      ) : batches.isError ? (
        <p style={{ color: c.danger }}>
          Could not load batches. Is the API running on {API_BASE_URL}?
        </p>
      ) : rows.length === 0 ? (
        <p style={{ color: c.muted }}>No batches yet. Close a week to create them.</p>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Shop</th>
                <th>Period</th>
                <th>Lines</th>
                <th>Payout</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <BatchRow key={b.id} batch={b} onPaid={flash} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className="card"
      style={{ padding: '12px 16px', minWidth: 150 }}
    >
      <div style={{ color: c.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div
        className="tnum"
        style={{ fontSize: 20, fontWeight: 700, color: accent ? c.brand : c.text, marginTop: 2 }}
      >
        {value}
      </div>
    </div>
  );
}

function fmtPeriod(b: RemittanceBatchView): string {
  const s = new Date(b.periodStart).toLocaleDateString();
  const e = new Date(b.periodEnd).toLocaleDateString();
  return `${s} – ${e}`;
}

function BatchRow({
  batch,
  onPaid,
}: {
  batch: RemittanceBatchView;
  onPaid: (m: string) => void;
}) {
  const qc = useQueryClient();
  const [ref, setRef] = useState('');
  const pay = useMutation({
    mutationFn: () => api.markRemittancePaid(batch.id, ref.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['remittance'] });
      onPaid('Marked paid');
    },
  });

  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{batch.shopId}</td>
      <td style={{ color: c.muted, fontSize: 12 }}>{fmtPeriod(batch)}</td>
      <td className="tnum">{batch.lineCount}</td>
      <td className="tnum" style={{ fontWeight: 600 }}>{peso(batch.totalPhp)}</td>
      <td>
        <StatusPill status={batch.status} />
      </td>
      <td>
        {batch.status === 'PAID' ? (
          <span style={{ color: c.muted, fontSize: 12 }}>{batch.reference ?? '—'}</span>
        ) : (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="Transfer ref"
              aria-label="Transfer reference"
              className="field-input"
              style={{ width: 130 }}
            />
            <button
              onClick={() => pay.mutate()}
              disabled={!ref.trim() || pay.isPending}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: 'none',
                background: !ref.trim() ? c.border : c.success,
                color: !ref.trim() ? c.muted : '#fff',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {pay.isPending ? '…' : 'Mark paid'}
            </button>
            {pay.isError ? (
              <span style={{ color: c.danger, fontSize: 12 }}>
                {pay.error instanceof Error ? pay.error.message : 'Failed'}
              </span>
            ) : null}
          </div>
        )}
      </td>
    </tr>
  );
}

function StatusPill({ status }: { status: 'PENDING' | 'PAID' }) {
  const color = status === 'PAID' ? c.success : c.warning;
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
      {status === 'PAID' ? 'Paid' : 'Pending'}
    </span>
  );
}
