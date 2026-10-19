import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { PwaRegister } from '../components/PwaRegister';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'Wash & Go Partner', template: '%s · Wash & Go Partner' },
  description: 'Work your laundry queue, weigh orders and track payouts.',
  applicationName: 'Wash & Go Partner',
  appleWebApp: { capable: true, title: 'Wash & Go', statusBarStyle: 'default' },
  icons: {
    icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  formatDetection: { telephone: false },
};

const PRELOAD_FONTS = [
  'atkinson-hyperlegible-next-latin.woff2',
  'archivo-expanded-800-latin.woff2',
  'atkinson-hyperlegible-mono-latin.woff2',
];

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B3773',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* The latin faces every screen uses, fetched with the HTML instead of
            after the CSS (the display headline was the late LCP repaint).
            latin-ext loads on demand through unicode-range. */}
        {PRELOAD_FONTS.map((f) => (
          <link key={f} rel="preload" href={`/fonts/${f}`} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
        {/* Hold the install offer if it fires before React hydrates (lib/useInstallPrompt). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__wgInstall=e;});",
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
