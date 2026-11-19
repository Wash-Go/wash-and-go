import { SearchX } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Page not found' };

// Any unknown URL (plan A4 "404"). Static, outside the sign-in gate.
export default function NotFound() {
  return (
    <main className="gate-wrap">
      <div className="gate" data-testid="not-found">
        <img className="lockup" src="/brand/logo-lockup-320.webp" alt="Wash & Go" width={93} height={56} />
        <SearchX aria-hidden="true" style={{ width: 32, height: 32, color: 'var(--sky)' }} />
        <h1 className="disp">We can&rsquo;t find that page</h1>
        <p>The link may be old or mistyped. Your orders are one tap away.</p>
        <Link className="btn btn-primary full" href="/">
          Open Orders
        </Link>
        <Link className="btn btn-text" href="/help" style={{ alignSelf: 'flex-start' }}>
          Get help
        </Link>
      </div>
    </main>
  );
}
