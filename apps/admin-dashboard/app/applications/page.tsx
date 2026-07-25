'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { AdminShopView, RiderApplicationView } from '@wash-and-go/domain';
import { api, API_BASE_URL } from '../../lib/api';
import { c } from '../../lib/theme';
import { TableSkeleton } from '../Skeleton';

// Shop verification review queue (onboarding C). Lists owner-submitted shops;
// admin checks the location + proof, then approves or rejects with a reason.
export default function ApplicationsPage() {
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  const apps = useQuery({
    queryKey: ['applications'],
    queryFn: () => api.listShopApplications(),
    // A live review queue — keep it fresh despite the global cache-forever default.
    staleTime: 15_000,
    refetchOnMount: 'always',
  });
  const riderApps = useQuery({
    queryKey: ['rider-applications'],
    queryFn: () => api.listRiderApplications(),
    staleTime: 15_000,
    refetchOnMount: 'always',
  });
  const rows = apps.data ?? [];
  const riderRows = riderApps.data ?? [];

  return (
    <>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Applications</h1>
        <p style={{ color: c.muted, marginTop: 6, maxWidth: 640 }}>
          Laundries that signed up and submitted for review. Check the pinned location and
          the proof, then approve (goes live) or reject with a reason (owner can fix and
          resubmit).
        </p>
      </header>

      <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>
        Laundries {rows.length ? `(${rows.length})` : ''}
      </h2>
      {apps.isLoading ? (
        <TableSkeleton rows={3} cols={4} />
      ) : apps.isError ? (
        <p style={{ color: c.danger }}>
          Could not load applications. Is the API running on {API_BASE_URL}?
        </p>
      ) : rows.length === 0 ? (
        <p style={{ color: c.muted }}>No shops waiting for review. 🎉</p>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {rows.map((s) => (
            <AppCard key={s.id} shop={s} onSaved={flash} />
          ))}
        </div>
      )}

      <h2 style={{ margin: '28px 0 12px', fontSize: 16 }}>
        Riders {riderRows.length ? `(${riderRows.length})` : ''}
      </h2>
      {riderApps.isLoading ? (
        <TableSkeleton rows={2} cols={4} />
      ) : riderApps.isError ? (
        <p style={{ color: c.danger }}>Could not load rider applications.</p>
      ) : riderRows.length === 0 ? (
        <p style={{ color: c.muted }}>No riders waiting for review. 🎉</p>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {riderRows.map((r) => (
            <RiderCard key={r.id} rider={r} onSaved={flash} />
          ))}
        </div>
      )}

      {toast ? (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: c.text,
            color: 'var(--bg)',
            padding: '10px 16px',
            borderRadius: 10,
            fontWeight: 600,
          }}
        >
          {toast}
        </div>
      ) : null}
    </>
  );
}

const btn = (bg: string, fg = '#fff'): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: 8,
  border: 'none',
  background: bg,
  color: fg,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
});

function AppCard({ shop, onSaved }: { shop: AdminShopView; onSaved: (m: string) => void }) {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['applications'] });
    qc.invalidateQueries({ queryKey: ['shops'] });
  };

  const verify = useMutation({
    mutationFn: () => api.verifyShop(shop.id),
    onSuccess: () => {
      invalidate();
      onSaved(`${shop.name} verified — now live`);
    },
  });
  const reject = useMutation({
    mutationFn: () => api.rejectShop(shop.id, reason.trim()),
    onSuccess: () => {
      invalidate();
      onSaved(`${shop.name} rejected`);
    },
  });

  const mapUrl = `https://www.google.com/maps?q=${shop.lat},${shop.lng}`;

  return (
    <div className="card" data-testid={`app-${shop.id}`} style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{shop.name}</div>
          <div style={{ color: c.muted, marginTop: 2 }}>{shop.address || <em>no address</em>}</div>
          <div style={{ color: c.muted, fontSize: 12, marginTop: 6 }}>
            Submitted {shop.submittedAt ? new Date(shop.submittedAt).toLocaleString() : '—'}
          </div>

          <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
            <a href={mapUrl} target="_blank" rel="noreferrer" style={{ color: c.brand, fontWeight: 600, fontSize: 13 }}>
              📍 {shop.lat}, {shop.lng} — view on map ↗
            </a>
            <ProofLink objectKey={shop.permitKey} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <button
            data-testid={`verify-${shop.id}`}
            onClick={() => verify.mutate()}
            disabled={verify.isPending}
            style={btn(c.success)}
          >
            {verify.isPending ? '…' : 'Approve'}
          </button>
          {!rejecting ? (
            <button
              data-testid={`reject-open-${shop.id}`}
              onClick={() => setRejecting(true)}
              style={{ ...btn('transparent', c.danger), border: `1px solid ${c.danger}` }}
            >
              Reject
            </button>
          ) : null}
        </div>
      </div>

      {rejecting ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="field-input"
            placeholder="Reason (shown to the owner)…"
            aria-label="Rejection reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ flex: 1, minWidth: 240 }}
          />
          <button
            data-testid={`reject-${shop.id}`}
            onClick={() => reject.mutate()}
            disabled={!reason.trim() || reject.isPending}
            style={btn(!reason.trim() ? c.border : c.danger, !reason.trim() ? c.muted : '#fff')}
          >
            {reject.isPending ? '…' : 'Confirm reject'}
          </button>
          <button onClick={() => setRejecting(false)} style={btn('transparent', c.muted)}>
            Cancel
          </button>
        </div>
      ) : null}
      {verify.isError || reject.isError ? (
        <div style={{ color: c.danger, fontSize: 12, marginTop: 8 }}>Action failed — try again.</div>
      ) : null}
    </div>
  );
}

function RiderCard({ rider, onSaved }: { rider: RiderApplicationView; onSaved: (m: string) => void }) {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['rider-applications'] });
    qc.invalidateQueries({ queryKey: ['riders'] });
  };

  const verify = useMutation({
    mutationFn: () => api.verifyRider(rider.id),
    onSuccess: () => {
      invalidate();
      onSaved(`${rider.displayName || rider.phone} verified`);
    },
  });
  const reject = useMutation({
    mutationFn: () => api.rejectRider(rider.id, reason.trim()),
    onSuccess: () => {
      invalidate();
      onSaved('Rider rejected');
    },
  });

  return (
    <div className="card" data-testid={`rider-app-${rider.id}`} style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{rider.displayName || 'Unnamed rider'}</div>
          <div style={{ color: c.muted, marginTop: 2 }}>{rider.phone}</div>
          <div style={{ color: c.muted, fontSize: 13, marginTop: 6 }}>
            {rider.vehicleType || '—'} · {rider.vehiclePlate || 'no plate'}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
            <ProofLink objectKey={rider.licenseKey} label="license" />
            <ProofLink objectKey={rider.idKey} label="ID" />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <button data-testid={`verify-rider-${rider.id}`} onClick={() => verify.mutate()} disabled={verify.isPending} style={btn(c.success)}>
            {verify.isPending ? '…' : 'Approve'}
          </button>
          {!rejecting ? (
            <button
              data-testid={`reject-rider-open-${rider.id}`}
              onClick={() => setRejecting(true)}
              style={{ ...btn('transparent', c.danger), border: `1px solid ${c.danger}` }}
            >
              Reject
            </button>
          ) : null}
        </div>
      </div>
      {rejecting ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="field-input"
            placeholder="Reason (shown to the rider)…"
            aria-label="Rider rejection reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ flex: 1, minWidth: 240 }}
          />
          <button
            data-testid={`reject-rider-${rider.id}`}
            onClick={() => reject.mutate()}
            disabled={!reason.trim() || reject.isPending}
            style={btn(!reason.trim() ? c.border : c.danger, !reason.trim() ? c.muted : '#fff')}
          >
            {reject.isPending ? '…' : 'Confirm reject'}
          </button>
          <button onClick={() => setRejecting(false)} style={btn('transparent', c.muted)}>
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}

// Proof file link — fetches a short-lived presigned GET on click. Degrades cleanly
// when R2 isn't configured (503) or no proof was attached.
function ProofLink({ objectKey, label = 'permit' }: { objectKey: string | null; label?: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  if (!objectKey) return <span style={{ color: c.muted, fontSize: 13 }}>no {label} uploaded</span>;

  const open = async () => {
    setState('loading');
    try {
      const { url } = await api.uploadViewUrl(objectKey);
      window.open(url, '_blank', 'noopener');
      setState('idle');
    } catch {
      setState('error');
    }
  };
  return (
    <button onClick={open} style={{ background: 'none', border: 'none', color: c.brand, fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 }}>
      {state === 'loading' ? 'opening…' : state === 'error' ? `${label} unavailable` : `📄 view ${label} ↗`}
    </button>
  );
}
