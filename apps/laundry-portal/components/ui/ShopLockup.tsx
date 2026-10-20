'use client';
import './lockup.css';
import { useEffect, useState } from 'react';
import { monogram } from '../../lib/monogram';

// The shop's own mark: its logo (presigned URL from GET /shop/me) or, without
// one or if the image fails, an initials monogram. null when there is
// nothing to show (no name yet, or the draft default "My laundry").
export function ShopMark({ name, logoUrl, large }: { name: string | null; logoUrl: string | null; large?: boolean }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [logoUrl]);
  const letters = monogram(name);
  const cls = `shop-mark${large ? ' shop-mark-lg' : ''}`;
  if (logoUrl && !broken) {
    return (
      <span className={cls} data-testid="shop-mark">
        <img src={logoUrl} alt={`${name ?? 'Shop'} logo`} onError={() => setBroken(true)} />
      </span>
    );
  }
  if (!letters) return null;
  return (
    <span className={cls} aria-hidden="true" data-testid="shop-mark">
      {letters}
    </span>
  );
}

// Header / rail identity (B8): [shop mark] × [Wash & Go whale]. Falls back to
// the whale alone when the shop has no mark.
export function ShopLockup({
  name,
  logoUrl,
  whaleClassName,
  whaleWidth,
  whaleHeight,
  className,
}: {
  name: string | null;
  logoUrl: string | null;
  whaleClassName?: string;
  whaleWidth: number;
  whaleHeight: number;
  className?: string;
}) {
  const hasMark = !!logoUrl || !!monogram(name);
  return (
    <span className={`shop-lockup${className ? ` ${className}` : ''}`} data-testid="shop-lockup">
      {hasMark ? (
        <>
          <ShopMark name={name} logoUrl={logoUrl} />
          <span className="lockup-x" aria-hidden="true">
            ×
          </span>
        </>
      ) : null}
      <img className={whaleClassName} src="/brand/logo-mark-96.webp" alt="" width={whaleWidth} height={whaleHeight} />
    </span>
  );
}
