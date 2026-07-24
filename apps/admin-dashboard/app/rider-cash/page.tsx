'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { newIdempotencyKey } from '@wash-and-go/api-client';
import { peso, type Rider, type RiderCashBalance } from '@wash-and-go/domain';
import { api, API_BASE_URL } from '../../lib/api';
import { c } from '../../lib/theme';
import { totalOutstandingPhp } from '../../lib/rider-cash';

export default function RiderCashPage() {
  const [toast, setToast] = useState<string | null>(null);
  const cash = useQuery({
    queryKey: ['rider-cash'],
    queryFn: () => api.getRiderCashSummary(),
  });
  const riders = useQuery({ queryKey: ['riders'], queryFn: () => api.getRiders() });

  const nameOf = useMemo(() => {
    const m = new Map((riders.data ?? []).map((r: Rider) => [r.id, r.displayName]));
    return (id: string) => m.get(id) ?? id.slice(0, 8);
  }, [riders.data]);

  const rows = cash.data ?? [];
  const owed = useMemo(() => totalOutstandingPhp(rows), [rows]);
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  return (
    <>
      <div className="page-head">
        <div className="page-eyebrow">Finance</div>
        <h1>Rider cash</h1>
        <p className="page-sub">
          Riders collect the full order total as COD, so that cash belongs to the
          platform. This is what each rider still owes = collected − deposited.
          Record a deposit when a rider hands cash back.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <Stat label="Outstanding (all riders)" value={peso(owed)} accent />
        <Stat label="Riders with COD" value={String(rows.length)} />
      </div>

      {cash.isLoading ? (
        <p style={{ color: c.muted }}>Loading…</p>
      ) : cash.isError ? (
        <p style={{ color: c.danger }}>
          Could not load. Is the API running on {API_BASE_URL}?
        </p>
      ) : rows.length === 0 ? (
        <p style={{ color: c.muted }}>No rider has collected COD yet.</p>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Rider</th>
                <th>Collected</th>
                <th>Deposited</th>
                <th>Outstanding</th>
                <th>Record deposit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <RiderRow key={r.riderId} row={r} name={nameOf(r.riderId)} onSaved={flash} />
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
    <div className="card" style={{ padding: '12px 16px', minWidth: 170 }}>
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

function RiderRow({
  row,
  name,
  onSaved,
}: {
  row: RiderCashBalance;
  name: string;
  onSaved: (m: string) => void;
}) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [ref, setRef] = useState('');
  const outstanding = Number(row.outstandingPhp);
  // One key per deposit — a double-click / retry dedupes to a single row; reset
  // after a success so the next deposit gets a fresh key.
  const keyRef = useRef<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      if (!keyRef.current) keyRef.current = newIdempotencyKey();
      return api.recordRiderDeposit(
        row.riderId,
        { amountPhp: Number(amount), reference: ref.trim() || undefined },
        keyRef.current,
      );
    },
    onSuccess: () => {
      keyRef.current = null;
      setAmount('');
      setRef('');
      qc.invalidateQueries({ queryKey: ['rider-cash'] });
      onSaved('Deposit recorded');
    },
  });

  const valid = Number(amount) > 0;

  return (
    <tr data-testid={`rider-cash-${row.riderId}`}>
      <td style={{ fontWeight: 600 }}>{name}</td>
      <td className="tnum">{peso(row.collectedPhp)}</td>
      <td className="tnum">{peso(row.depositedPhp)}</td>
      <td
        className="tnum"
        style={{ fontWeight: 700, color: outstanding > 0 ? c.warning : c.success }}
      >
        {peso(row.outstandingPhp)}
      </td>
      <td>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="₱ amount"
            inputMode="decimal"
            className="field-input"
            style={{ width: 100 }}
          />
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="ref"
            className="field-input"
            style={{ width: 90 }}
          />
          <button
            onClick={() => save.mutate()}
            disabled={!valid || save.isPending}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: 'none',
              background: !valid ? c.border : c.brand,
              color: !valid ? c.muted : '#fff',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {save.isPending ? '…' : 'Deposit'}
          </button>
        </div>
      </td>
    </tr>
  );
}
