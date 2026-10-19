'use client';
import './onboarding.css';
import { formatPhMobile } from '@wash-and-go/domain';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useConsole } from '../console/ConsoleContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SkeletonCard } from '../ui/Skeleton';
import { api } from '../../lib/api';
import { REVIEW_COPY } from '../../lib/onboarding';
import { draftFromServer } from '../../lib/wizard';
import { ShopSummary } from './ShopSummary';

// After Submit (preview B6): what happens next, in order, and who to call.
// Read-only summary on demand. No dead end: Sign out stays on the page.
export function UnderReview() {
  const { shop, me } = useConsole();
  const [open, setOpen] = useState(false);
  const services = useQuery({
    queryKey: ['shop-services', me.id],
    queryFn: () => api.shopServices(),
    enabled: open,
    refetchInterval: false,
  });
  if (!shop) return null;
  const first = me.displayName.trim().split(/\s+/)[0];
  const phone = shop.contactPhone ? formatPhMobile(shop.contactPhone) : null;

  return (
    <div className="wiz" data-testid="under-review">
      <h1 className="disp">We&rsquo;re checking your shop</h1>
      <p>
        Thanks{first ? `, ${first}` : ''}. Your details, rates and hours are in. Orders open once our team has verified{' '}
        {shop.name}.
      </p>
      <Card>
        <div className="lbl" style={{ marginBottom: 10 }}>
          What happens next
        </div>
        <ol className="wiz-ol">
          <li>
            Our team calls {phone ? <span className="mono">{phone}</span> : 'you'} {REVIEW_COPY.callWithin}.
          </li>
          <li>
            We visit {shop.address || 'your shop'} to see the storefront and check the scale.
          </li>
          {shop.documentsPending ? <li>We&rsquo;ll check your permit in person.</li> : null}
          <li>You get a text, and Orders opens on your next sign-in.</li>
        </ol>
      </Card>
      <Card>
        <div className="lbl" style={{ marginBottom: 6 }}>
          Questions
        </div>
        <p className="small">{REVIEW_COPY.opsContact}</p>
      </Card>
      {open ? (
        services.data ? (
          <ShopSummary
            draft={draftFromServer(
              shop,
              services.data.map((s) => ({ id: s.serviceId, code: s.code, name: s.name, billingUnit: s.billingUnit })),
              services.data,
            )}
            uploadsConfigured={!shop.documentsPending}
            documentsPending={shop.documentsPending}
          />
        ) : services.isError ? (
          <p className="small muted">We couldn&rsquo;t load your summary. Try again in a moment.</p>
        ) : (
          <SkeletonCard label="Loading what you submitted" />
        )
      ) : (
        <Button variant="text" onClick={() => setOpen(true)} style={{ alignSelf: 'flex-start' }}>
          See what you submitted
        </Button>
      )}
    </div>
  );
}
