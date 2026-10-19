'use client';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrderStatus, OrderView } from '@wash-and-go/domain';
import { Bell, BellOff, ChevronDown, Inbox, RefreshCw, Search, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { OrderCard } from '../../components/orders/OrderCard';
import { useOrdersLive } from '../../components/orders/OrdersLive';
import { OrderDetail } from '../../components/orders/OrderDetail';
import { WeighSheet } from '../../components/orders/WeighSheet';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { StaleBanner } from '../../components/ui/StaleBanner';
import { api } from '../../lib/api';
import { useLastLive, useNow, useOnline } from '../../lib/live';
import { activeListQuery, doneListQuery, ORDERS_KEY } from '../../lib/order-queries';
import {
  ACTIVE_LIMIT,
  activeTruncated,
  countLabel,
  DONE_PAGE,
  DONE_STATUSES,
  mergeOrders,
  partitionQueue,
  QUEUE_TABS,
  sortQueue,
  type QueueTab,
} from '../../lib/queue';
import { formatUpdatedAgo } from '../../lib/relative-time';
import { DESKTOP, useMedia } from '../../lib/useMedia';

const isTab = (v: string | null): v is QueueTab => QUEUE_TABS.some((t) => t.key === v);

const EMPTY: Record<QueueTab, { title: string; body: string }> = {
  needs: { title: 'Nothing needs you right now.', body: 'New orders show up here when a rider drops them off.' },
  washing: { title: 'Nothing in the wash.', body: 'Orders move here when you mark them washing.' },
  ready: { title: 'Nothing waiting for a rider.', body: 'Orders you mark ready for pickup wait here until the rider delivers them.' },
  done: { title: 'No finished orders yet.', body: 'Delivered and cancelled orders are kept here.' },
};

// Orders queue (plan A4, preview B2 / C1).
export default function OrdersPage() {
  const qc = useQueryClient();
  const live = useOrdersLive();
  const now = useNow();
  const online = useOnline();
  const lastLive = useLastLive();
  const desktop = useMedia(DESKTOP);

  const [tab, setTabState] = useState<QueueTab>('needs');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  // Older Done pages per terminal status (before cursor).
  const [extras, setExtras] = useState<Partial<Record<OrderStatus, OrderView[]>>>({});
  const [exhausted, setExhausted] = useState<Partial<Record<OrderStatus, boolean>>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [weighing, setWeighing] = useState<OrderView | null>(null);
  const [incomingOpen, setIncomingOpen] = useState(false);
  const [panel, setPanel] = useState<OrderView | null>(null);

  // The tab lives in the URL (?tab=washing) so back from a detail returns to it.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (isTab(t)) setTabState(t);
  }, []);
  const setTab = (t: QueueTab) => {
    setTabState(t);
    const url = t === 'needs' ? '/' : `/?tab=${t}`;
    window.history.replaceState(null, '', url);
  };

  // Search by order code, debounced; a new search drops loaded-more pages.
  useEffect(() => {
    const id = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);
  useEffect(() => {
    setExtras({});
    setExhausted({});
    setMoreError(false);
  }, [q]);

  const active = useQuery(activeListQuery(q));
  const doneQs = useQueries({ queries: DONE_STATUSES.map((st) => doneListQuery(st, q, tab === 'done')) });
  const isNew = useCallback((id: string) => live.isNew(id, now), [live, now]);

  const parts = useMemo(() => partitionQueue(active.data ?? []), [active.data]);
  const truncated = activeTruncated(active.data?.length ?? 0);

  // Done: each terminal status's polled first page plus any older pages.
  const doneByStatus = DONE_STATUSES.map((st, i) => {
    const first = doneQs[i].data;
    const more = extras[st] ?? [];
    const orders = mergeOrders(first ?? [], more);
    const canMore = first !== undefined && (more.length ? !exhausted[st] : first.length >= DONE_PAGE);
    return { status: st, first, orders, canMore };
  });
  const done = doneByStatus.flatMap((d) => d.orders);
  const doneCanMore = doneByStatus.some((d) => d.canMore);
  const doneNoData = doneQs.some((r) => r.data === undefined);

  const isDone = tab === 'done';
  const view = isDone ? sortQueue(done, () => false) : sortQueue(parts[tab], isNew);
  const incoming = tab === 'needs' ? sortQueue(parts.incoming, isNew) : [];
  const noData = isDone ? doneNoData : active.data === undefined;
  const loading = noData && (isDone ? doneQs.some((r) => r.isLoading) : active.isLoading);
  const failed = isDone ? doneQs.some((r) => r.isError) : active.isError;
  // Active counts are exact (one page holds every active order); Done shows
  // "N+" while older orders remain.
  const counts = Object.fromEntries(
    QUEUE_TABS.map((t) =>
      t.key === 'done'
        ? [t.key, doneNoData ? '' : countLabel(done.length, doneCanMore)]
        : [t.key, active.data === undefined ? '' : String(parts[t.key].length)],
    ),
  ) as Record<QueueTab, string>;

  const loadMore = async () => {
    setLoadingMore(true);
    setMoreError(false);
    try {
      const pages = await Promise.all(
        doneByStatus
          .filter((d) => d.canMore)
          .map(async (d) => {
            const last = d.orders[d.orders.length - 1];
            const page = await api.listOrders(d.status, q || undefined, DONE_PAGE, last?.id);
            return { d, page };
          }),
      );
      // Keep a snapshot of the first page too: as new orders arrive, its
      // oldest rows slide off the polled page and would otherwise fall into
      // the gap before the loaded pages (the polled copy still wins).
      setExtras((prev) => {
        const next = { ...prev };
        for (const { d, page } of pages) {
          const had = prev[d.status];
          next[d.status] = [...(had?.length ? had : (d.first ?? [])), ...page];
        }
        return next;
      });
      setExhausted((prev) => {
        const next = { ...prev };
        for (const { d, page } of pages) next[d.status] = page.length < DONE_PAGE;
        return next;
      });
    } catch {
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const refreshing = active.isFetching || doneQs.some((r) => r.isFetching);
  const refresh = () => void qc.refetchQueries({ queryKey: ORDERS_KEY });
  const updated = now && lastLive ? formatUpdatedAgo(lastLive, now) : null;

  // From 1024 px the detail opens in the side panel beside the queue (C1);
  // on a phone the card links to the /orders/[id] route.
  const onOpen = desktop
    ? (o: OrderView, e: MouseEvent<HTMLAnchorElement>) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        setPanel(o);
      }
    : undefined;

  return (
    <section data-testid="orders-queue" className="queue">
      <div className="qhead">
        <div>
          <h1 className="disp">Orders</h1>
        </div>
        <div className="qtools">
          <Button
            variant="text"
            icon={<RefreshCw aria-hidden="true" className={refreshing ? 'spin' : undefined} />}
            onClick={refresh}
            aria-busy={refreshing || undefined}
          >
            Refresh
          </Button>
          <Button
            variant="text"
            icon={live.chimeOn ? <Bell aria-hidden="true" /> : <BellOff aria-hidden="true" />}
            aria-pressed={live.chimeOn}
            data-testid="chime-toggle"
            onClick={() => live.setChime(!live.chimeOn)}
          >
            Chime
          </Button>
        </div>
      </div>
      {live.chimeWaiting ? (
        <p className="small muted" data-testid="chime-waiting">
          Chime is on. Tap anywhere once so your browser lets it play.
        </p>
      ) : null}

      <label className="qsearch">
        <span className="sr-only">Search by order code</span>
        <Search aria-hidden="true" />
        <input
          className="input"
          type="search"
          inputMode="search"
          placeholder="Search by order code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>

      <div className="qtabs" role="tablist" aria-label="Order status">
        {QUEUE_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls="queue-panel"
            className={[tab === t.key ? 'on' : '', t.key === 'needs' ? 'needs' : ''].filter(Boolean).join(' ')}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {counts[t.key] !== '' ? <em data-testid={`count-${t.key}`}>{counts[t.key]}</em> : null}
          </button>
        ))}
      </div>

      {!isDone && truncated ? (
        <div className="stale" role="status" data-testid="active-truncated">
          <TriangleAlert aria-hidden="true" />
          <span>
            Showing the oldest {ACTIVE_LIMIT} active orders. Search by order code to find a newer one.
          </span>
        </div>
      ) : null}
      {online && failed && !noData ? (
        <StaleBanner message={`Couldn't refresh. Showing what we last saw${updated ? `, ${updated}` : ''}.`} onRetry={refresh} />
      ) : null}

      <div id="queue-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="qlist">
        {incoming.length > 0 ? (
          <details
            className="incoming"
            data-testid="incoming"
            open={incomingOpen}
            onToggle={(e) => setIncomingOpen(e.currentTarget.open)}
          >
            <summary>
              <span>Incoming ({incoming.length})</span>
              <ChevronDown aria-hidden="true" />
            </summary>
            {/* Rendered only while open, so collapsed cards are not in the page. */}
            {incomingOpen ? (
              <>
                <p className="small muted">Booked for your shop and on the way. Nothing to do until the rider drops them off.</p>
                <div className="qlist">
                  {incoming.map((o) => (
                    <OrderCard key={o.id} order={o} bucket="incoming" isNew={isNew(o.id)} now={now} onWeigh={setWeighing} onOpen={onOpen} />
                  ))}
                </div>
              </>
            ) : null}
          </details>
        ) : null}

        {loading ? (
          <>
            <SkeletonCard label="Loading orders" />
            <SkeletonCard label="Loading orders" />
          </>
        ) : noData ? (
          <ErrorState title="Your queue didn't load." body="Check your connection, then try again." onRetry={refresh} />
        ) : view.length === 0 ? (
          q ? (
            <EmptyState
              icon={Search}
              title={`No ${QUEUE_TABS.find((t) => t.key === tab)!.label.toLowerCase()} order matches “${q}”.`}
              body="Check the code on the bag tag, or look in the other tabs."
              action={
                <Button variant="secondary" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Inbox}
              title={EMPTY[tab].title}
              body={EMPTY[tab].body}
              action={
                tab === 'needs' && !live.chimeOn ? (
                  <Button variant="secondary" icon={<Bell aria-hidden="true" />} onClick={() => live.setChime(true)}>
                    Turn on the chime
                  </Button>
                ) : null
              }
            />
          )
        ) : (
          view.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              bucket={tab}
              isNew={tab === 'needs' && isNew(o.id)}
              now={now}
              onWeigh={setWeighing}
              onOpen={onOpen}
              quiet={desktop && (weighing != null || panel != null)}
            />
          ))
        )}

        {isDone && doneCanMore ? (
          <div className="qmore">
            <Button variant="secondary" onClick={() => void loadMore()} disabled={loadingMore} aria-busy={loadingMore || undefined}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
            {moreError ? <div className="field-error" role="alert">Couldn&apos;t load more orders. Try again.</div> : null}
          </div>
        ) : null}
      </div>

      {panel ? (
        <Sheet open onClose={() => setPanel(null)} title={`Order ${panel.code.slice(-4)}`}>
          <OrderDetail
            id={panel.id}
            inPanel
            onWeigh={(o) => {
              setPanel(null);
              setWeighing(o);
            }}
          />
          <Link className="back" href={`/orders/${panel.id}`}>
            Open the full page
          </Link>
        </Sheet>
      ) : null}
      {weighing ? <WeighSheet key={weighing.id} order={weighing} onClose={() => setWeighing(null)} /> : null}
    </section>
  );
}
