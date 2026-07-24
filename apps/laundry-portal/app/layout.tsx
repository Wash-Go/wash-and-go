import './globals.css';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import { AuthGate } from './AuthGate';
import { AuthChip } from './AuthChip';

export const metadata = {
  title: 'Wash & Go — Shop',
  description: 'Laundry partner queue',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AuthGate>
            <header className="topbar">
              <div>
                <div className="brand-name">Wash &amp; Go</div>
                <div className="brand-sub">Shop console</div>
              </div>
              <AuthChip />
            </header>
            <main className="content">{children}</main>
          </AuthGate>
        </Providers>
      </body>
    </html>
  );
}
