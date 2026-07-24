'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type {
  AdminShopDetail,
  AdminShopServiceView,
  AdminShopView,
} from '@wash-and-go/domain';
import { api, API_BASE_URL } from '../../lib/api';
import { c } from '../../lib/theme';

// Shop onboarding console (checkpoint C). List/create shops, then drill into one
// to price services (from the catalog) and manage staff. Grant the platform
// SHOP_OWNER/SHOP_STAFF role separately on the Users page.
export default function ShopsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  const shops = useQuery({ queryKey: ['shops'], queryFn: () => api.listShops() });
  const rows = shops.data ?? [];

  return (
    <>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Shops</h1>
        <p style={{ color: c.muted, marginTop: 6, maxWidth: 640 }}>
          Onboard a laundry: create the shop, price its services, and add staff.
          Rates are partner-set here. Grant the SHOP_OWNER / SHOP_STAFF platform
          role on the Users page after the person signs in.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        <NewShop onSaved={flash} />

        {shops.isLoading ? (
          <p style={{ color: c.muted }}>Loading shops…</p>
        ) : shops.isError ? (
          <p style={{ color: c.danger }}>
            Could not load shops. Is the API running on {API_BASE_URL}?
          </p>
        ) : rows.length === 0 ? (
          <p style={{ color: c.muted }}>No shops yet. Create the first one above.</p>
        ) : (
          <div className="card" style={{ overflow: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Commission</th>
                  <th>Express slots</th>
                  <th>Services</th>
                  <th>Staff</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <ShopRow
                    key={s.id}
                    shop={s}
                    open={selected === s.id}
                    onToggle={() => setSelected(selected === s.id ? null : s.id)}
                    onSaved={flash}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
  padding: '6px 12px',
  borderRadius: 8,
  border: 'none',
  background: bg,
  color: fg,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
});

function NewShop({ onSaved }: { onSaved: (m: string) => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: '', address: '', lat: '', lng: '' });
  const valid =
    f.name.trim() && f.address.trim() && f.lat.trim() !== '' && f.lng.trim() !== '';

  const create = useMutation({
    mutationFn: () =>
      api.createShop({
        name: f.name.trim(),
        address: f.address.trim(),
        lat: Number(f.lat),
        lng: Number(f.lng),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shops'] });
      setF({ name: '', address: '', lat: '', lng: '' });
      onSaved('Shop created');
    },
  });

  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ margin: '0 0 12px' }}>New shop</h3>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="field-input"
          placeholder="Name"
          aria-label="Shop name"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
        <input
          className="field-input"
          placeholder="Address"
          aria-label="Shop address"
          value={f.address}
          onChange={(e) => setF({ ...f, address: e.target.value })}
          style={{ width: 220 }}
        />
        <input
          className="field-input"
          placeholder="Lat"
          aria-label="Latitude"
          value={f.lat}
          onChange={(e) => setF({ ...f, lat: e.target.value })}
          style={{ width: 100 }}
        />
        <input
          className="field-input"
          placeholder="Lng"
          aria-label="Longitude"
          value={f.lng}
          onChange={(e) => setF({ ...f, lng: e.target.value })}
          style={{ width: 100 }}
        />
        <button
          data-testid="create-shop"
          onClick={() => create.mutate()}
          disabled={!valid || create.isPending}
          style={btn(!valid ? c.border : c.brand, !valid ? c.muted : '#fff')}
        >
          {create.isPending ? '…' : 'Create'}
        </button>
        {create.isError ? (
          <span style={{ color: c.danger, fontSize: 12 }}>failed — check inputs</span>
        ) : null}
      </div>
    </div>
  );
}

function ShopRow({
  shop,
  open,
  onToggle,
  onSaved,
}: {
  shop: AdminShopView;
  open: boolean;
  onToggle: () => void;
  onSaved: (m: string) => void;
}) {
  const qc = useQueryClient();
  const toggleActive = useMutation({
    mutationFn: () => api.updateShop(shop.id, { active: !shop.active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shops'] });
      onSaved(shop.active ? 'Shop deactivated' : 'Shop activated');
    },
  });

  return (
    <>
      <tr data-testid={`shop-${shop.id}`} style={{ opacity: shop.active ? 1 : 0.55 }}>
        <td style={{ fontWeight: 600 }}>{shop.name}</td>
        <td style={{ color: c.muted }}>{shop.address}</td>
        <td>{shop.commissionPct}%</td>
        <td>{shop.expressSlotsPerDay}</td>
        <td>{shop.serviceCount}</td>
        <td>{shop.memberCount}</td>
        <td>
          {shop.active ? (
            <span style={{ color: c.success, fontWeight: 600, fontSize: 12 }}>Active</span>
          ) : (
            <span style={{ color: c.danger, fontWeight: 600, fontSize: 12 }}>Inactive</span>
          )}
        </td>
        <td>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              data-testid={`manage-${shop.id}`}
              onClick={onToggle}
              style={btn('transparent', c.brand)}
            >
              {open ? 'Close' : 'Manage'}
            </button>
            <button
              data-testid={`toggle-active-${shop.id}`}
              onClick={() => toggleActive.mutate()}
              disabled={toggleActive.isPending}
              style={{
                ...btn('transparent', shop.active ? c.danger : c.success),
                border: `1px solid ${shop.active ? c.danger : c.success}`,
              }}
            >
              {shop.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={8} style={{ background: c.surface2, padding: 16 }}>
            <ShopDetail shopId={shop.id} onSaved={onSaved} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function ShopDetail({ shopId, onSaved }: { shopId: string; onSaved: (m: string) => void }) {
  const detail = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => api.getShop(shopId),
  });
  const catalog = useQuery({
    queryKey: ['catalog'],
    queryFn: () => api.getShopCatalog(),
  });

  if (detail.isLoading) return <p style={{ color: c.muted }}>Loading…</p>;
  if (detail.isError || !detail.data) {
    return <p style={{ color: c.danger }}>Could not load shop.</p>;
  }
  const d: AdminShopDetail = detail.data;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Services shop={d} catalog={catalog.data ?? []} onSaved={onSaved} />
      <Members shop={d} onSaved={onSaved} />
    </div>
  );
}

function Services({
  shop,
  catalog,
  onSaved,
}: {
  shop: AdminShopDetail;
  catalog: { id: string; code: string; name: string }[];
  onSaved: (m: string) => void;
}) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['shop', shop.id] });
    qc.invalidateQueries({ queryKey: ['shops'] });
  };
  const [serviceId, setServiceId] = useState('');
  const [rate, setRate] = useState('');
  const [hours, setHours] = useState('');
  const taken = new Set(shop.services.map((s) => s.serviceId));
  const available = catalog.filter((s) => !taken.has(s.id));
  const valid = serviceId && rate.trim() !== '' && hours.trim() !== '';

  const add = useMutation({
    mutationFn: () =>
      api.addShopService(shop.id, {
        serviceId,
        ratePhp: Number(rate),
        turnaroundHours: Number(hours),
      }),
    onSuccess: () => {
      invalidate();
      setServiceId('');
      setRate('');
      setHours('');
      onSaved('Service added');
    },
  });

  return (
    <div>
      <h4 style={{ margin: '0 0 10px' }}>Services</h4>
      {shop.services.length === 0 ? (
        <p style={{ color: c.muted, fontSize: 13 }}>No services priced yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {shop.services.map((s) => (
            <ServiceRow key={s.id} shopId={shop.id} svc={s} onChanged={invalidate} onSaved={onSaved} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          aria-label="Service to add"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          data-testid={`add-service-select-${shop.id}`}
        >
          <option value="">Add a service…</option>
          {available.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.name}
            </option>
          ))}
        </select>
        <input
          className="field-input"
          placeholder="Rate ₱"
          aria-label="Rate"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          style={{ width: 90 }}
        />
        <input
          className="field-input"
          placeholder="Hours"
          aria-label="Turnaround hours"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          style={{ width: 80 }}
        />
        <button
          data-testid={`add-service-${shop.id}`}
          onClick={() => add.mutate()}
          disabled={!valid || add.isPending}
          style={btn(!valid ? c.border : c.brand, !valid ? c.muted : '#fff')}
        >
          {add.isPending ? '…' : 'Add'}
        </button>
        {add.isError ? <span style={{ color: c.danger, fontSize: 12 }}>failed</span> : null}
      </div>
    </div>
  );
}

function ServiceRow({
  shopId,
  svc,
  onChanged,
  onSaved,
}: {
  shopId: string;
  svc: AdminShopServiceView;
  onChanged: () => void;
  onSaved: (m: string) => void;
}) {
  const [rate, setRate] = useState(svc.ratePhp);
  const dirty = rate !== svc.ratePhp;
  const save = useMutation({
    mutationFn: () => api.updateShopService(shopId, svc.id, { ratePhp: Number(rate) }),
    onSuccess: () => {
      onChanged();
      onSaved('Rate updated');
    },
  });
  const toggle = useMutation({
    mutationFn: () => api.updateShopService(shopId, svc.id, { active: !svc.active }),
    onSuccess: () => {
      onChanged();
      onSaved(svc.active ? 'Service disabled' : 'Service enabled');
    },
  });

  return (
    <div
      data-testid={`svc-${svc.id}`}
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        opacity: svc.active ? 1 : 0.55,
      }}
    >
      <span style={{ fontWeight: 600, minWidth: 90 }}>{svc.code}</span>
      <span style={{ color: c.muted, flex: 1 }}>{svc.name}</span>
      <span style={{ color: c.muted, fontSize: 12 }}>{svc.turnaroundHours}h</span>
      <span>₱</span>
      <input
        className="field-input"
        aria-label={`Rate for ${svc.code}`}
        value={rate}
        onChange={(e) => setRate(e.target.value)}
        style={{ width: 80 }}
      />
      <button
        onClick={() => save.mutate()}
        disabled={!dirty || save.isPending}
        style={btn(!dirty ? c.border : c.brand, !dirty ? c.muted : '#fff')}
      >
        {save.isPending ? '…' : 'Save'}
      </button>
      <button
        onClick={() => toggle.mutate()}
        disabled={toggle.isPending}
        style={{
          ...btn('transparent', svc.active ? c.danger : c.success),
          border: `1px solid ${svc.active ? c.danger : c.success}`,
        }}
      >
        {svc.active ? 'Disable' : 'Enable'}
      </button>
    </div>
  );
}

function Members({ shop, onSaved }: { shop: AdminShopDetail; onSaved: (m: string) => void }) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['shop', shop.id] });
    qc.invalidateQueries({ queryKey: ['shops'] });
  };
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<'OWNER' | 'STAFF'>('STAFF');

  const add = useMutation({
    mutationFn: () => api.addShopMember(shop.id, { userId: userId.trim(), role }),
    onSuccess: () => {
      invalidate();
      setUserId('');
      onSaved('Staff added');
    },
  });
  const remove = useMutation({
    mutationFn: (memberId: string) => api.removeShopMember(shop.id, memberId),
    onSuccess: () => {
      invalidate();
      onSaved('Staff removed');
    },
  });

  return (
    <div>
      <h4 style={{ margin: '0 0 10px' }}>Staff</h4>
      {shop.members.length === 0 ? (
        <p style={{ color: c.muted, fontSize: 13 }}>No staff yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {shop.members.map((m) => (
            <div
              key={m.id}
              data-testid={`member-${m.id}`}
              style={{ display: 'flex', gap: 10, alignItems: 'center' }}
            >
              <span style={{ fontWeight: 600, minWidth: 60 }}>{m.role}</span>
              <span style={{ flex: 1 }}>
                {m.displayName || '—'} <span style={{ color: c.muted }}>· {m.phone}</span>
              </span>
              <button
                onClick={() => remove.mutate(m.id)}
                disabled={remove.isPending}
                style={{ ...btn('transparent', c.danger), border: `1px solid ${c.danger}` }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="field-input"
          placeholder="User ID (from Users page)"
          aria-label="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={{ width: 260 }}
        />
        <select
          aria-label="Member role"
          value={role}
          onChange={(e) => setRole(e.target.value as 'OWNER' | 'STAFF')}
        >
          <option value="STAFF">STAFF</option>
          <option value="OWNER">OWNER</option>
        </select>
        <button
          data-testid={`add-member-${shop.id}`}
          onClick={() => add.mutate()}
          disabled={!userId.trim() || add.isPending}
          style={btn(!userId.trim() ? c.border : c.brand, !userId.trim() ? c.muted : '#fff')}
        >
          {add.isPending ? '…' : 'Add staff'}
        </button>
        {add.isError ? <span style={{ color: c.danger, fontSize: 12 }}>failed</span> : null}
      </div>
    </div>
  );
}
