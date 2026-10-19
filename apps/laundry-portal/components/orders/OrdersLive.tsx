'use client';
import { useQueries } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { emptyNewOrders, isNewOrder, trackNewOrders, type NewOrdersState } from '../../lib/new-orders';
import { orderListQuery } from '../../lib/order-queries';
import { BUCKET_STATUSES, QUEUE_PAGE } from '../../lib/queue';

// App-wide watch on the orders that need the shop: Needs you (AT_SHOP) and
// Incoming (booked, assigned, picked up). Mounted in the shell so the tab bar
// badge and the "New" ring work on every console page. Uses the same query
// keys as the queue (unfiltered), so React Query shares one request.
type Live = {
  needsCount: number;
  needsFull: boolean;
  isNew: (id: string, now: number) => boolean;
};

const LiveCtx = createContext<Live>({ needsCount: 0, needsFull: false, isNew: () => false });

const WATCHED = [...BUCKET_STATUSES.needs, ...BUCKET_STATUSES.incoming];

export function OrdersLiveProvider({ children }: { children: ReactNode }) {
  const results = useQueries({ queries: WATCHED.map((s) => orderListQuery(s, '')) });
  const [rings, setRings] = useState<NewOrdersState>(emptyNewOrders);
  const ringsRef = useRef(rings);

  const ready = results.every((r) => r.data !== undefined);
  // Keyed by bucket: an order rings once when it is booked for the shop and
  // again when the rider drops it off (that is when the shop must act).
  const ids = ready
    ? results.flatMap((r, i) => (r.data ?? []).map((o) => `${WATCHED[i] === 'AT_SHOP' ? 'needs' : 'incoming'}:${o.id}`))
    : null;
  const idsKey = ids ? ids.join(',') : null;

  useEffect(() => {
    if (!ids) return;
    const next = trackNewOrders(ringsRef.current, ids, Date.now());
    if (next.state !== ringsRef.current) {
      ringsRef.current = next.state;
      setRings(next.state);
    }
    // ids is derived from idsKey; re-run only when the id list changes.
  }, [idsKey]);

  const needs = results[0]?.data ?? [];
  const isNew = useCallback(
    (id: string, now: number) => isNewOrder(rings, `needs:${id}`, now) || isNewOrder(rings, `incoming:${id}`, now),
    [rings],
  );
  const value = useMemo(
    () => ({ needsCount: needs.length, needsFull: needs.length >= QUEUE_PAGE, isNew }),
    [needs.length, isNew],
  );
  return <LiveCtx.Provider value={value}>{children}</LiveCtx.Provider>;
}

export function useOrdersLive(): Live {
  return useContext(LiveCtx);
}
