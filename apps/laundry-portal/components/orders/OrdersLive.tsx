'use client';
import { useQuery } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { readChimePref, shouldChime, writeChimePref } from '../../lib/chime';
import { audioUnlocked, playChime, unlockAudio } from '../../lib/chime-audio';
import { emptyNewOrders, isNewOrder, trackNewOrders, type NewOrdersState } from '../../lib/new-orders';
import { orderListQuery } from '../../lib/order-queries';
import { badgeTitle, partitionQueue } from '../../lib/queue';

// App-wide watch on the orders that need the shop: Needs you (AT_SHOP) and
// Incoming (booked, assigned, picked up). Mounted in the shell so the tab bar
// badge, the title count, the "New" ring and the chime work on every console
// page. Uses the queue's own unfiltered list query, so React Query shares the
// one request.
type Live = {
  needsCount: number;
  isNew: (id: string, now: number) => boolean;
  chimeOn: boolean;
  // Chime is on but no gesture has unlocked audio since this page loaded.
  chimeWaiting: boolean;
  setChime: (on: boolean) => void;
};

const LiveCtx = createContext<Live>({
  needsCount: 0,
  isNew: () => false,
  chimeOn: false,
  chimeWaiting: false,
  setChime: () => undefined,
});

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function OrdersLiveProvider({ children }: { children: ReactNode }) {
  const list = useQuery(orderListQuery(''));
  const [rings, setRings] = useState<NewOrdersState>(emptyNewOrders);
  const ringsRef = useRef(rings);
  const [chimeOn, setChimeOn] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const chimeRef = useRef({ on: false, lastAt: null as number | null });
  chimeRef.current.on = chimeOn;

  useEffect(() => setChimeOn(readChimePref(storage())), []);

  // Audio unlocks on the first gesture after the shop has turned the chime
  // on (browsers refuse sound before one). Never before.
  useEffect(() => {
    if (!chimeOn || unlocked) return;
    const onGesture = () => {
      unlockAudio();
      // resume() settles asynchronously.
      setTimeout(() => setUnlocked(audioUnlocked()), 50);
    };
    const opts = { capture: true } as const;
    window.addEventListener('pointerdown', onGesture, opts);
    window.addEventListener('keydown', onGesture, opts);
    return () => {
      window.removeEventListener('pointerdown', onGesture, opts);
      window.removeEventListener('keydown', onGesture, opts);
    };
  }, [chimeOn, unlocked]);

  // Called from the toggle's click, itself a gesture: unlock and play once
  // so the shop hears what it turned on.
  const setChime = useCallback((on: boolean) => {
    writeChimePref(storage(), on);
    setChimeOn(on);
    if (on) {
      unlockAudio();
      setTimeout(() => {
        const ok = audioUnlocked();
        setUnlocked(ok);
        if (ok) playChime();
      }, 50);
    }
  }, []);

  const parts = list.data ? partitionQueue(list.data) : null;
  // Keyed by bucket: an order rings once when it is booked for the shop and
  // again when the rider drops it off (that is when the shop must act).
  const ids = parts
    ? [...parts.needs.map((o) => `needs:${o.id}`), ...parts.incoming.map((o) => `incoming:${o.id}`)]
    : null;
  const idsKey = ids ? ids.join(',') : null;

  useEffect(() => {
    if (!ids) return;
    const next = trackNewOrders(ringsRef.current, ids, Date.now());
    if (next.state !== ringsRef.current) {
      ringsRef.current = next.state;
      setRings(next.state);
    }
    const now = Date.now();
    const c = chimeRef.current;
    if (shouldChime({ enabled: c.on, unlocked: audioUnlocked(), arrived: next.arrived.length, lastAt: c.lastAt, now })) {
      c.lastAt = now;
      playChime();
    }
    // ids is derived from idsKey; re-run only when the id list changes.
  }, [idsKey]);

  const needs = parts?.needs ?? [];
  const needsAt = list.dataUpdatedAt;
  const pathname = usePathname();

  // Browser tab title carries the Needs-you count: "(3) Orders · Wash & Go".
  // Re-applied on each poll, since a route change resets the title.
  useEffect(() => {
    const base = pathname === '/' ? 'Orders · Wash & Go' : document.title;
    document.title = badgeTitle(needs.length, base);
  }, [needs.length, needsAt, pathname]);

  const isNew = useCallback(
    (id: string, now: number) => isNewOrder(rings, `needs:${id}`, now) || isNewOrder(rings, `incoming:${id}`, now),
    [rings],
  );
  const value = useMemo(
    () => ({
      needsCount: needs.length,
      isNew,
      chimeOn,
      chimeWaiting: chimeOn && !unlocked,
      setChime,
    }),
    [needs.length, isNew, chimeOn, unlocked, setChime],
  );
  return <LiveCtx.Provider value={value}>{children}</LiveCtx.Provider>;
}

export function useOrdersLive(): Live {
  return useContext(LiveCtx);
}
