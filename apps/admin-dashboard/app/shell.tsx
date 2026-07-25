'use client';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { signOut } from 'firebase/auth';
import { api } from '../lib/api';
import { auth } from '../lib/firebase';
import { useAuth } from '../lib/useAuth';

const NAV = [
  { href: '/', label: 'Dispatch' },
  { href: '/shops', label: 'Shops' },
  { href: '/users', label: 'Users' },
  { href: '/remittance', label: 'Payouts' },
  { href: '/rider-cash', label: 'Rider cash' },
  { href: '/zones', label: 'Zones' },
  { href: '/config', label: 'Business rules' },
];

// Warm each page's primary query on hover so the click lands on cached data.
// Keys/fns must match exactly what the target page's useQuery uses.
const PREFETCH: Record<string, { queryKey: unknown[]; queryFn: () => Promise<unknown> }> = {
  '/shops': { queryKey: ['shops'], queryFn: () => api.listShops() },
  '/users': { queryKey: ['users', '', ''], queryFn: () => api.listUsers(undefined, undefined) },
  '/rider-cash': { queryKey: ['rider-cash'], queryFn: () => api.getRiderCashSummary() },
  '/zones': { queryKey: ['zones'], queryFn: () => api.getZones() },
  '/config': { queryKey: ['config'], queryFn: () => api.getConfig() },
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, devBypass } = useAuth();
  const qc = useQueryClient();
  const prefetch = (href: string) => {
    const p = PREFETCH[href];
    if (p) void qc.prefetchQuery({ ...p, staleTime: 30_000 });
  };
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <div className="brand-name">Wash &amp; Go</div>
          <div className="brand-sub">Admin</div>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="nav-link"
              onMouseEnter={() => prefetch(n.href)}
              data-active={n.href === '/' ? pathname === '/' : pathname.startsWith(n.href)}
            >
              <span className="nav-dot" />
              {n.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          {!devBypass && user ? (
            <>
              <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </span>
              <button
                onClick={() => signOut(auth)}
                style={{
                  marginTop: 6,
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  opacity: 0.7,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: 12,
                  textDecoration: 'underline',
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            'Admin console'
          )}
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
