import { WifiOff } from 'lucide-react';

export const metadata = { title: 'Offline' };

// Served by the service worker for a page that was never opened online
// (precached at build). Static: no data, no auth.
export default function OfflinePage() {
  return (
    <main className="gate-wrap">
      <div className="gate" data-testid="offline-page">
        <img className="lockup" src="/brand/logo-lockup-320.webp" alt="Wash & Go" width={93} height={56} />
        <WifiOff aria-hidden="true" style={{ width: 32, height: 32, color: 'var(--sky)' }} />
        <h1 className="disp">You&rsquo;re offline</h1>
        <p>This page needs a connection the first time. Orders you already opened still show from the last time we synced.</p>
        <a className="btn btn-primary full" href="/">
          Open Orders
        </a>
        <p className="small muted">The portal reconnects on its own when the signal comes back.</p>
      </div>
    </main>
  );
}
