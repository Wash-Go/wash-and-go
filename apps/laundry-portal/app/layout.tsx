import './globals.css';
import type { ReactNode } from 'react';
import { Providers } from './providers';

export const metadata = {
  title: 'Wash & Go — Shop',
  description: 'Laundry partner queue',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header className="topbar">
            <div>
              <div className="brand-name">Wash &amp; Go</div>
              <div className="brand-sub">Shop console</div>
            </div>
            <span className="role-chip">dev-shop-owner</span>
          </header>
          <main className="content">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
