'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrderView } from '@wash-and-go/domain';
import { ChevronDown, Inbox, RefreshCw, Search } from 'lucide-react';
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
import { ORDERS_KEY, orderListQuery } from '../../lib/order-queries';
import {
  countLabel,
  mergeOrders,
  partitionQueue,
  QUEUE_PAGE,
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
  const [extras, setExtras] = useState<OrderView[]>([]);
  const [exhausted, setExhausted] = useState(false);
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
    setExtras([]);
    setExhausted(false);
    setMoreError(false);
  }, [q]);

  const list = useQuery(orderListQuery(q));
  const isNew = useCallback((id: string) => live.isNew(id, now), [live, now]);

  // The polled first page plus any older pages loaded with the cursor.
  const all = useMemo(() => mergeOrders(list.data ?? [], extras), [list.data, extras]);
  const parts = useMemo(() => partitionQueue(all), [all]);
  const lastPageFull = extras.length ? !exhausted : (list.data?.length ?? 0) >= QUEUE_PAGE;
  const canMore = list.data !== undefined && lastPageFull;
  const noData = list.data === undefined;

  const view = sortQueue(parts[tab], isNew);
  const incoming = tab === 'needs' ? sortQueue(parts.incoming, isNew) : [];
  // Active orders are recent, so they sit in the newest page; Done is the one
  // list that keeps going past it.
  const counts = Object.fromEntries(
    QUEUE_TABS.map((t) => [t.key, noData ? '' : countLabel(parts[t.key].length, t.key === 'done' && canMore)]),
  ) as Record<QueueTab, string>;

  const loadMore = async () => {
    setLoadingMore(true);
    setMoreError(false);
    try {
      const last = all[all.length - 1];
      const page = await api.listOrders(undefined, q || undefined, QUEUE_PAGE, last?.id);
      setExtras((prev) => [...prev, ...page]);
      setExhausted(page.length < QUEUE_PAGE);
    } catch {
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const refreshing = list.isFetching;
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
        </div>
      </div>
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

      {online && list.isError && !noData ? (
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

        {noData && list.isLoading ? (
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

        {canMore && (tab === 'done' || q) ? (
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
