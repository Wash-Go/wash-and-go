'use client';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import type { OrderStatus, OrderView } from '@wash-and-go/domain';
import { ChevronDown, Inbox, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { OrderCard } from '../../components/orders/OrderCard';
import { useOrdersLive } from '../../components/orders/OrdersLive';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { StaleBanner } from '../../components/ui/StaleBanner';
import { api } from '../../lib/api';
import { useLastLive, useNow, useOnline } from '../../lib/live';
import { ORDERS_KEY, orderListQuery } from '../../lib/order-queries';
import {
  BUCKET_STATUSES,
  countLabel,
  mergeOrders,
  QUEUE_PAGE,
  QUEUE_TABS,
  sortQueue,
  type QueueBucket,
  type QueueTab,
} from '../../lib/queue';
import { formatUpdatedAgo } from '../../lib/relative-time';
import { DESKTOP, useMedia } from '../../lib/useMedia';

type Extra = { items: OrderView[]; exhausted: boolean };
const ALL_STATUSES = (Object.keys(BUCKET_STATUSES) as QueueBucket[]).flatMap((b) => BUCKET_STATUSES[b]);
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
  const [extras, setExtras] = useState<Partial<Record<OrderStatus, Extra>>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [weighing, setWeighing] = useState<OrderView | null>(null);

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
    setMoreError(false);
  }, [q]);

  const results = useQueries({ queries: ALL_STATUSES.map((s) => orderListQuery(s, q)) });
  const byStatus = useMemo(() => {
    const m = {} as Record<OrderStatus, (typeof results)[number]>;
    ALL_STATUSES.forEach((s, i) => (m[s] = results[i]));
    return m;
  }, [results]);

  const isNew = useCallback((id: string) => live.isNew(id, now), [live, now]);

  const bucket = (b: QueueBucket) => {
    const statuses = BUCKET_STATUSES[b];
    const rs = statuses.map((s) => byStatus[s]);
    const orders = statuses.flatMap((s) => mergeOrders(byStatus[s].data ?? [], extras[s]?.items ?? []));
    // A status can page further when its last page came back full.
    const canMore = statuses.filter((s) => {
      const ex = extras[s];
      if (ex) return !ex.exhausted;
      return (byStatus[s].data?.length ?? 0) >= QUEUE_PAGE;
    });
    return {
      orders: sortQueue(orders, isNew),
      canMore,
      loading: rs.some((r) => r.data === undefined && r.isLoading),
      failed: rs.some((r) => r.isError),
      noData: rs.every((r) => r.data === undefined),
    };
  };

  const view = bucket(tab);
  const incoming = tab === 'needs' ? bucket('incoming') : null;
  const counts = Object.fromEntries(
    QUEUE_TABS.map((t) => {
      const b = bucket(t.key);
      return [t.key, b.noData ? '' : countLabel(b.orders.length, b.canMore.length > 0)];
    }),
  ) as Record<QueueTab, string>;

  const loadMore = async () => {
    setLoadingMore(true);
    setMoreError(false);
    try {
      const pages = await Promise.all(
        view.canMore.map(async (s) => {
          const have = mergeOrders(byStatus[s].data ?? [], extras[s]?.items ?? []);
          const last = have[have.length - 1];
          const page = await api.listOrders(s, q || undefined, QUEUE_PAGE, last?.id);
          return [s, page] as const;
        }),
      );
      setExtras((prev) => {
        const next = { ...prev };
        for (const [s, page] of pages) {
          next[s] = { items: [...(prev[s]?.items ?? []), ...page], exhausted: page.length < QUEUE_PAGE };
        }
        return next;
      });
    } catch {
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const refreshing = results.some((r) => r.isFetching);
  const refresh = () => void qc.refetchQueries({ queryKey: ORDERS_KEY });
  const updated = now && lastLive ? formatUpdatedAgo(lastLive, now) : null;

  const onOpen = undefined;

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

      {online && view.failed && !view.noData ? (
        <StaleBanner message={`Couldn't refresh. Showing what we last saw${updated ? `, ${updated}` : ''}.`} onRetry={refresh} />
      ) : null}

      <div id="queue-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="qlist">
        {incoming && incoming.orders.length > 0 ? (
          <details className="incoming" data-testid="incoming">
            <summary>
              <span>Incoming ({countLabel(incoming.orders.length, incoming.canMore.length > 0)})</span>
              <ChevronDown aria-hidden="true" />
            </summary>
            <p className="small muted">Booked for your shop and on the way. Nothing to do until the rider drops them off.</p>
            <div className="qlist">
              {incoming.orders.map((o) => (
                <OrderCard key={o.id} order={o} bucket="incoming" isNew={isNew(o.id)} now={now} onWeigh={setWeighing} onOpen={onOpen} />
              ))}
            </div>
          </details>
        ) : null}

        {view.loading ? (
          <>
            <SkeletonCard label="Loading orders" />
            <SkeletonCard label="Loading orders" />
          </>
        ) : view.failed && view.noData ? (
          <ErrorState title="Your queue didn't load." body="Check your connection, then try again." onRetry={refresh} />
        ) : view.orders.length === 0 ? (
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
            <EmptyState icon={Inbox} title={EMPTY[tab].title} body={EMPTY[tab].body} />
          )
        ) : (
          view.orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              bucket={tab}
              isNew={tab === 'needs' && isNew(o.id)}
              now={now}
              onWeigh={setWeighing}
              onOpen={onOpen}
              quiet={desktop && weighing != null}
            />
          ))
        )}

        {view.canMore.length > 0 && !view.loading ? (
          <div className="qmore">
            <Button variant="secondary" onClick={() => void loadMore()} disabled={loadingMore} aria-busy={loadingMore || undefined}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
            {moreError ? <div className="field-error" role="alert">Couldn&apos;t load more orders. Try again.</div> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
