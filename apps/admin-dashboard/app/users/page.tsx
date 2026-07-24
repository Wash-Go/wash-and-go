'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  USER_ROLES,
  type AdminUserView,
  type UserRole,
} from '@wash-and-go/domain';
import { api, API_BASE_URL } from '../../lib/api';
import { c } from '../../lib/theme';

export default function UsersPage() {
  const [role, setRole] = useState<UserRole | ''>('');
  const [q, setQ] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  const users = useQuery({
    queryKey: ['users', role, q],
    queryFn: () => api.listUsers(role || undefined, q || undefined),
  });

  const rows = users.data ?? [];

  return (
    <>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Users</h1>
        <p style={{ color: c.muted, marginTop: 6, maxWidth: 640 }}>
          Grant roles to onboard riders and shop staff (they sign in first, then
          you promote them here), and enable or disable accounts.
        </p>
      </header>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole | '')}
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search phone or name…"
          aria-label="Search users"
          className="field-input"
          style={{ width: 240 }}
        />
      </div>

      {users.isLoading ? (
        <p style={{ color: c.muted }}>Loading users…</p>
      ) : users.isError ? (
        <p style={{ color: c.danger }}>
          Could not load users. Is the API running on {API_BASE_URL}?
        </p>
      ) : rows.length === 0 ? (
        <p style={{ color: c.muted }}>No users match this view.</p>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Phone</th>
                <th>Name</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Account</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <UserRow key={u.id} user={u} onSaved={flash} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast ? (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: c.text,
            color: '#fff',
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

function UserRow({
  user,
  onSaved,
}: {
  user: AdminUserView;
  onSaved: (m: string) => void;
}) {
  const qc = useQueryClient();
  const [roles, setRoles] = useState<UserRole[]>(user.roles);
  const disabled = user.disabledAt != null;

  const dirty =
    roles.length !== user.roles.length ||
    roles.some((r) => !user.roles.includes(r));

  const save = useMutation({
    mutationFn: () => api.setUserRoles(user.id, roles),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      onSaved('Roles updated');
    },
  });

  const toggleDisabled = useMutation({
    mutationFn: () => api.setUserDisabled(user.id, !disabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      onSaved(disabled ? 'Account enabled' : 'Account disabled');
    },
  });

  const toggle = (r: UserRole) =>
    setRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );

  return (
    <tr data-testid={`user-${user.id}`} style={{ opacity: disabled ? 0.55 : 1 }}>
      <td style={{ fontWeight: 600 }}>{user.phone}</td>
      <td>{user.displayName || <span style={{ color: c.muted }}>—</span>}</td>
      <td>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {USER_ROLES.map((r) => (
            <label
              key={r}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}
            >
              <input
                type="checkbox"
                checked={roles.includes(r)}
                onChange={() => toggle(r)}
                data-testid={`role-${user.id}-${r}`}
              />
              {r}
            </label>
          ))}
        </div>
      </td>
      <td>
        {disabled ? (
          <span style={{ color: c.danger, fontWeight: 600, fontSize: 12 }}>Disabled</span>
        ) : (
          <span style={{ color: c.success, fontWeight: 600, fontSize: 12 }}>Active</span>
        )}
      </td>
      <td>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            data-testid={`save-roles-${user.id}`}
            onClick={() => save.mutate()}
            disabled={!dirty || save.isPending}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: 'none',
              background: !dirty ? c.border : c.brand,
              color: !dirty ? c.muted : '#fff',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {save.isPending ? '…' : 'Save roles'}
          </button>
          <button
            data-testid={`toggle-disabled-${user.id}`}
            onClick={() => toggleDisabled.mutate()}
            disabled={toggleDisabled.isPending}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: `1px solid ${disabled ? c.success : c.danger}`,
              background: 'transparent',
              color: disabled ? c.success : c.danger,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {toggleDisabled.isPending ? '…' : disabled ? 'Enable' : 'Disable'}
          </button>
          {(save.isError || toggleDisabled.isError) ? (
            <span style={{ color: c.danger, fontSize: 12 }}>failed</span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
