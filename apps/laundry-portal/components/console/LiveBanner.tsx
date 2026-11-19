'use client';
import '../onboarding/onboarding.css';
import { CircleCheck, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { liveBannerKey, shouldShowLiveBanner } from '../../lib/live-banner';
import { useConsole } from './ConsoleContext';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// One-time "You're live" banner on the queue (plan A3 flow 1). Mounted from
// the console layout, shown only on Orders for a recently verified shop until
// the owner dismisses it on this device.
export function LiveBanner() {
  const { shop, gate } = useConsole();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (shop?.id) setDismissed(storage()?.getItem(liveBannerKey(shop.id)) === '1');
  }, [shop?.id]);

  if (gate.kind !== 'ready' || pathname !== '/') return null;
  if (!shouldShowLiveBanner(shop, dismissed, Date.now())) return null;

  return (
    <div className="top-notice notice-ok" role="region" aria-label="You're live" data-testid="live-banner">
      <CircleCheck aria-hidden="true" />
      <div className="top-notice-body">
        <b>You&rsquo;re live.</b>
        Customers in your zone can now book {shop!.name}. New orders land in Needs you.
      </div>
      <button
        type="button"
        className="icon-close"
        aria-label="Dismiss"
        onClick={() => {
          setDismissed(true);
          try {
            storage()?.setItem(liveBannerKey(shop!.id), '1');
          } catch {
            /* ignore */
          }
        }}
      >
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
