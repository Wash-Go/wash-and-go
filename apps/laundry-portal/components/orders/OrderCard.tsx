'use client';
import type { OrderView } from '@wash-and-go/domain';
import Link from 'next/link';
import type { MouseEvent } from 'react';
import { cardMeta, shortName, type QueueBucket } from '../../lib/queue';
import { formatAgo } from '../../lib/relative-time';
import { OrderChip } from '../ui/Chip';
import { StatusAction } from './StatusAction';

// Queue card (preview B2): last-4 code big in mono with the full code small,
// status chip, who · service · size, age + rider, one primary action.
export function OrderCard({
  order: o,
  bucket,
  isNew,
  now,
  onWeigh,
  onOpen,
  quiet,
}: {
  order: OrderView;
  bucket: QueueBucket;
  isNew: boolean;
  now: number;
  onWeigh: (o: OrderView) => void;
  // Desktop opens the detail in the side panel instead of navigating.
  onOpen?: (o: OrderView, e: MouseEvent<HTMLAnchorElement>) => void;
  // While a side panel holds the primary action, cards drop to secondary (C1).
  quiet?: boolean;
}) {
  const rider = o.rider?.displayName ? `rider ${shortName(o.rider.displayName)}` : null;
  const age = now ? `booked ${formatAgo(new Date(o.createdAt).getTime(), now)}` : null;
  return (
    <article className={`card card-pad oc${isNew ? ' oc-new' : ''}`} data-testid={`order-${o.code}`}>
      <div className="oc-h">
        <Link
          href={`/orders/${o.id}`}
          className="oc-code"
          aria-label={`${o.code.slice(-4)}, order ${o.code}${isNew ? ', new' : ''}`}
          onClick={onOpen ? (e) => onOpen(o, e) : undefined}
        >
          {o.code.slice(-4)}
          {isNew ? <span className="newtag">New</span> : null}
          <small>{o.code}</small>
        </Link>
        <OrderChip status={o.status} needsYou={bucket === 'needs'} />
      </div>
      <div className="oc-m">{cardMeta(o)}</div>
      {age || rider ? <div className="oc-t">{[age, rider].filter(Boolean).join(' · ')}</div> : null}
      <StatusAction order={o} onWeigh={onWeigh} variant={quiet ? 'secondary' : 'primary'} />
    </article>
  );
}
