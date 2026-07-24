'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../lib/useAuth';

const NAV = [
  { href: '/', label: 'Dispatch' },
  { href: '/users', label: 'Users' },
  { href: '/remittance', label: 'Payouts' },
  { href: '/rider-cash', label: 'Rider cash' },
  { href: '/zones', label: 'Zones' },
  { href: '/config', label: 'Business rules' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, devBypass } = useAuth();
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
