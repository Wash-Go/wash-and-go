'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { ZoneView } from '@wash-and-go/domain';
import { api, API_BASE_URL } from '../../lib/api';
import { c } from '../../lib/theme';
import { parseVertices, polygonSvgPoints } from '../../lib/zones';

const SAMPLE = '6.86, 122.02\n6.86, 122.14\n6.98, 122.14\n6.98, 122.02';

export default function ZonesPage() {
  const qc = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  const zones = useQuery({ queryKey: ['zones'], queryFn: () => api.getZones() });
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  return (
    <>
      <div className="page-head">
        <div className="page-eyebrow">Coverage</div>
        <h1>Zones</h1>
        <p className="page-sub">
          A pickup is covered when it falls inside any active zone. With no zones,
          the app falls back to the pilot Zamboanga ring. Draw zones by entering
          their boundary points.
        </p>
      </div>

      <CreateZone
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ['zones'] });
          flash('Zone created');
        }}
      />

      <div className="page-eyebrow" style={{ margin: '26px 0 8px' }}>
        Zones
      </div>
      {zones.isLoading ? (
        <p style={{ color: c.muted }}>Loading…</p>
      ) : zones.isError ? (
        <p style={{ color: c.danger }}>
          Could not load. Is the API running on {API_BASE_URL}?
        </p>
      ) : (zones.data ?? []).length === 0 ? (
        <p style={{ color: c.muted }}>No zones yet — the pilot ring is in effect.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {zones.data!.map((z) => (
            <ZoneCard key={z.id} zone={z} onChanged={flash} />
          ))}
        </div>
      )}

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}

function CreateZone({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [text, setText] = useState(SAMPLE);
  const parsed = useMemo(() => parseVertices(text), [text]);
  const svg = useMemo(() => polygonSvgPoints(parsed.vertices), [parsed.vertices]);

  const create = useMutation({
    mutationFn: () => api.createZone({ name: name.trim(), polygon: parsed.vertices }),
    onSuccess: () => {
      setName('');
      onCreated();
    },
  });

  const valid = name.trim().length > 0 && parsed.ok;

  return (
    <section className="card" style={{ padding: 18 }}>
      <h2 style={{ marginBottom: 12 }}>New zone</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, display: 'grid', gap: 10 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Zone name (e.g. Tetuan)"
            className="field-input"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="One boundary point per line: lat, lng"
            aria-label="Zone boundary points"
            rows={6}
            className="field-input"
            style={{ fontFamily: 'monospace', resize: 'vertical' }}
          />
          {!parsed.ok ? (
            <span style={{ color: c.danger, fontSize: 12 }}>{parsed.error}</span>
          ) : (
            <span style={{ color: c.muted, fontSize: 12 }}>
              {parsed.vertices.length} points
            </span>
          )}
          <button
            onClick={() => create.mutate()}
            disabled={!valid || create.isPending}
            style={{
              justifySelf: 'start',
              padding: '9px 18px',
              borderRadius: 9,
              border: 'none',
              background: !valid ? c.border : c.brand,
              color: !valid ? c.muted : '#fff',
              fontWeight: 700,
            }}
          >
            {create.isPending ? 'Creating…' : 'Create zone'}
          </button>
          {create.isError ? (
            <span style={{ color: c.danger, fontSize: 12 }}>
              Create failed — check the points.
            </span>
          ) : null}
        </div>
        <ZonePreview points={svg} />
      </div>
    </section>
  );
}

function ZonePreview({ points }: { points: string }) {
  return (
    <div
      style={{
        width: 160,
        height: 160,
        border: `1px solid ${c.border}`,
        borderRadius: 10,
        background: c.surface2,
      }}
    >
      {points ? (
        <svg viewBox="0 0 100 100" width="100%" height="100%" aria-label="zone shape">
          <polygon
            points={points}
            fill={c.brand + '22'}
            stroke={c.brand}
            strokeWidth={1.5}
          />
        </svg>
      ) : (
        <div
          style={{
            display: 'flex',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            color: c.muted,
            fontSize: 12,
          }}
        >
          preview
        </div>
      )}
    </div>
  );
}

function ZoneCard({ zone, onChanged }: { zone: ZoneView; onChanged: (m: string) => void }) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: () => api.setZoneActive(zone.id, !zone.active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones'] });
      onChanged(zone.active ? 'Zone deactivated' : 'Zone activated');
    },
  });
  const pts = polygonSvgPoints(zone.polygon);

  return (
    <div
      className="card"
      data-testid={`zone-${zone.id}`}
      style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}
    >
      <div style={{ width: 64, height: 64, flexShrink: 0 }}>
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <polygon
            points={pts}
            fill={(zone.active ? c.success : c.muted) + '22'}
            stroke={zone.active ? c.success : c.muted}
            strokeWidth={2}
          />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{zone.name}</div>
        <div style={{ color: c.muted, fontSize: 12 }}>
          {zone.polygon.length} points ·{' '}
          <span style={{ color: zone.active ? c.success : c.muted, fontWeight: 600 }}>
            {zone.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      <button
        onClick={() => toggle.mutate()}
        disabled={toggle.isPending}
        style={{
          padding: '7px 14px',
          borderRadius: 8,
          border: `1px solid ${c.border}`,
          background: c.surface,
          color: c.text,
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {toggle.isPending ? '…' : zone.active ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  );
}
