'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/', label: 'Dispatch' },
  { href: '/config', label: 'Business rules' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
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
        <div className="sidebar-foot">Signed in · dev-admin</div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
