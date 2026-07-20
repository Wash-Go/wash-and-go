import './globals.css';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import { AppShell } from './shell';

export const metadata = {
  title: 'Wash & Go — Admin',
  description: 'Dispatch console',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
