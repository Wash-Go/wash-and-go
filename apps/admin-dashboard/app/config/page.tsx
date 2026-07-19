'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { ConfigAuditEntry, PlatformConfigView } from '@wash-and-go/domain';
import { api, API_BASE_URL } from '../../lib/api';
import { c } from '../../lib/theme';
import {
  CONFIG_FIELDS,
  CONFIG_GROUPS,
  diffPatch,
  validateField,
  type ConfigField,
} from '../../lib/config';

type Draft = Record<string, string>;

function draftFrom(cfg: PlatformConfigView): Draft {
  return Object.fromEntries(CONFIG_FIELDS.map((f) => [f, String(cfg[f])]));
}

function toNumbers(d: Draft): Record<ConfigField, number> {
  return Object.fromEntries(
    CONFIG_FIELDS.map((f) => [f, Number(d[f])]),
  ) as Record<ConfigField, number>;
}

export default function ConfigPage() {
  const qc = useQueryClient();
  const cfg = useQuery({ queryKey: ['config'], queryFn: () => api.getConfig() });
  const audit = useQuery({
    queryKey: ['config-audit'],
    queryFn: () => api.getConfigAudit(10),
  });

  const [draft, setDraft] = useState<Draft>({});
  useEffect(() => {
    if (cfg.data) setDraft(draftFrom(cfg.data));
  }, [cfg.data]);

  const errors = useMemo(() => {
    const e: Partial<Record<ConfigField, string>> = {};
    for (const f of CONFIG_FIELDS) {
      const err = validateField(Number(draft[f]));
      if (err) e[f] = err;
    }
    return e;
  }, [draft]);

  const patch = useMemo(
    () => (cfg.data ? diffPatch(cfg.data, toNumbers(draft)) : {}),
    [cfg.data, draft],
  );
  const dirtyCount = Object.keys(patch).length;
  const hasErrors = Object.keys(errors).length > 0;

  const save = useMutation({
    mutationFn: () => api.updateConfig(patch),
    onSuccess: (fresh) => {
      qc.setQueryData(['config'], fresh);
      qc.invalidateQueries({ queryKey: ['config-audit'] });
    },
  });

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: 24 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <h1>Business rules</h1>
        <a href="/" style={{ color: c.brand, fontSize: 13, fontWeight: 600 }}>
          ← Dispatch
        </a>
      </header>
      <p style={{ color: c.muted, fontSize: 13, marginBottom: 20 }}>
        Platform-level rules, applied live — no redeploy. Per-shop wash rates stay
        in each laundry&rsquo;s portal.
        {cfg.data ? (
          <>
            {' '}
            Last changed {new Date(cfg.data.updatedAt).toLocaleString()}.
          </>
        ) : null}
      </p>

      {cfg.isLoading ? (
        <p style={{ color: c.muted }}>Loading…</p>
      ) : cfg.isError ? (
        <p style={{ color: c.danger }}>
          Could not load config. Is the API running on {API_BASE_URL}?
        </p>
      ) : (
        <>
          {CONFIG_GROUPS.map((g) => (
            <section
              key={g.title}
              style={{
                background: g.placeholder ? '#FFF7ED' : c.surface,
                border: `1px solid ${g.placeholder ? '#FED7AA' : c.border}`,
                borderRadius: 12,
                padding: 16,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: g.note ? 4 : 12,
                }}
              >
                <h2 style={{ fontSize: 15, margin: 0 }}>{g.title}</h2>
                {g.placeholder ? (
                  <span
                    style={{
                      background: c.warning,
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 0.4,
                      padding: '2px 7px',
                      borderRadius: 5,
                      textTransform: 'uppercase',
                    }}
                  >
                    Not yet applied
                  </span>
                ) : null}
              </div>
              {g.note ? (
                <p style={{ color: c.muted, fontSize: 12, margin: '0 0 12px' }}>
                  {g.note}
                </p>
              ) : null}

              <div style={{ display: 'grid', gap: 12 }}>
                {g.fields.map((f) => (
                  <label
                    key={f.key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 160px',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>
                        {f.label}
                      </span>
                      {f.hint ? (
                        <span
                          style={{
                            display: 'block',
                            color: c.muted,
                            fontSize: 12,
                          }}
                        >
                          {f.hint}
                        </span>
                      ) : null}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {f.unit ? (
                        <span style={{ color: c.muted, fontSize: 13 }}>
                          {f.unit}
                        </span>
                      ) : null}
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={draft[f.key] ?? ''}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                        }
                        style={{
                          width: '100%',
                          padding: '7px 9px',
                          borderRadius: 8,
                          border: `1px solid ${errors[f.key] ? c.danger : c.border}`,
                          fontSize: 14,
                        }}
                      />
                    </span>
                    {errors[f.key] ? (
                      <span
                        style={{
                          gridColumn: '2',
                          color: c.danger,
                          fontSize: 11,
                          justifySelf: 'end',
                        }}
                      >
                        {errors[f.key]}
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
            </section>
          ))}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginTop: 18,
            }}
          >
            <button
              disabled={dirtyCount === 0 || hasErrors || save.isPending}
              onClick={() => save.mutate()}
              style={{
                padding: '10px 20px',
                borderRadius: 9,
                border: 'none',
                background:
                  dirtyCount === 0 || hasErrors ? c.border : c.brand,
                color: dirtyCount === 0 || hasErrors ? c.muted : '#fff',
                fontWeight: 700,
                cursor: dirtyCount === 0 || hasErrors ? 'default' : 'pointer',
              }}
            >
              {save.isPending
                ? 'Saving…'
                : dirtyCount > 0
                  ? `Save ${dirtyCount} change${dirtyCount > 1 ? 's' : ''}`
                  : 'Saved'}
            </button>
            {cfg.data && dirtyCount > 0 ? (
              <button
                onClick={() => setDraft(draftFrom(cfg.data!))}
                style={{
                  padding: '10px 14px',
                  borderRadius: 9,
                  border: `1px solid ${c.border}`,
                  background: c.surface,
                  color: c.text,
                  fontWeight: 600,
                }}
              >
                Reset
              </button>
            ) : null}
            {save.isError ? (
              <span style={{ color: c.danger, fontSize: 13 }}>
                Save failed — check the values and try again.
              </span>
            ) : null}
            {save.isSuccess && dirtyCount === 0 ? (
              <span style={{ color: c.success, fontSize: 13 }}>Saved.</span>
            ) : null}
          </div>

          <AuditLog rows={audit.data ?? []} />
        </>
      )}
    </main>
  );
}

function AuditLog({ rows }: { rows: ConfigAuditEntry[] }) {
  if (rows.length === 0) return null;
  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 14, color: c.muted }}>Recent changes</h2>
      <div
        style={{
          background: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: 12,
          overflow: 'auto',
        }}
      >
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Field</th>
              <th>Change</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ color: c.muted, fontSize: 12, whiteSpace: 'nowrap' }}>
                  {new Date(r.changedAt).toLocaleString()}
                </td>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{r.field}</td>
                <td style={{ fontSize: 13 }}>
                  {r.oldValue} → {r.newValue}
                </td>
                <td style={{ color: c.muted, fontSize: 12 }}>{r.actorUid}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
