'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { InstallCard } from '../InstallCard';

// Demo controls and chip, only in the standalone demo build (NEXT_PUBLIC_DEMO=1).
const Demo: typeof import('../demo/DemoControls') | null =
  process.env.NEXT_PUBLIC_DEMO === '1' ? require('../demo/DemoControls') : null;
import { OrdersLiveProvider, useOrdersLive } from '../orders/OrdersLive';
import { useConsole } from '../console/ConsoleContext';
import { useLastLive, useNow, useOnline } from '../../lib/live';
import { activeTab, MORE_ITEMS, RAIL_ITEMS, TAB_ITEMS, type NavItem } from '../../lib/nav';
import { formatUpdatedAgo } from '../../lib/relative-time';
import { shopMeKey } from '../../lib/shop-profile';
import { api } from '../../lib/api';
import { ShopChip } from './Chip';
import { NAV_ICONS } from './icons';
import { Sheet } from './Sheet';
import { ShopLockup } from './ShopLockup';
import { StaleBanner } from './StaleBanner';
import { ThemeSwitch } from './ThemeSwitch';

// Portal frame (plan A2, preview B2/C1). Header: whale mark + shop name +
// verification chip + "updated N s ago". Under 1024px a bottom tab bar
// (Orders · Services · Payouts · Shop · More); from 1024px a navy left rail
// with Staff, Help and Sign out.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <OrdersLiveProvider>
      <Frame>{children}</Frame>
    </OrdersLiveProvider>
  );
}

// The Orders nav item carries the Needs-you count (plan A3 flow 3).
function NavCount({ item }: { item: NavItem }) {
  const { needsCount } = useOrdersLive();
  if (item.key !== 'orders' || needsCount === 0) return null;
  return (
    <span className="nav-count" data-testid="nav-needs-count">
      {needsCount}
      <span className="sr-only"> need you</span>
    </span>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const { shop, me, signOut } = useConsole();
  const pathname = usePathname();
  const active = activeTab(pathname);
  const [moreOpen, setMoreOpen] = useState(false);
  const online = useOnline();
  const lastLive = useLastLive();
  const now = useNow();
  const qc = useQueryClient();

  // GET /shop/me (OWNER or STAFF), the Shop page's own query: the staff's shop
  // name, and the logo for the identity lockup (B8). logoUrl is a 5-minute
  // presigned link, so it is refetched on mount and focus and treated as stale
  // after 4 minutes; the mark falls back to the monogram if the image fails.
  const profile = useQuery({
    queryKey: shopMeKey(me.id),
    queryFn: () => api.shopMe(),
    refetchInterval: false,
    staleTime: 4 * 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  const logoUrl = profile.data?.logoUrl ?? null;
  const shopName = shop?.name || profile.data?.name || 'Your shop';
  const role = me.roles.includes('SHOP_OWNER') ? 'Owner' : 'Staff';
  const who = me.displayName ? `${role} · ${me.displayName}` : role;
  const updated = now && lastLive ? formatUpdatedAgo(lastLive, now) : null;

  return (
    <div className="shell">
      <nav className="rail" aria-label="Main">
        <div className="rail-who">
          <ShopLockup name={shopName} logoUrl={logoUrl} whaleClassName="rail-whale" whaleWidth={44} whaleHeight={23} />
          <div>
            {shopName}
            <small>{who}</small>
          </div>
        </div>
        {RAIL_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const on = active === item.key;
          return (
            <Link key={item.key} href={item.href} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined}>
              <Icon aria-hidden="true" />
              {item.label}
              <NavCount item={item} />
            </Link>
          );
        })}
        <div className="rail-foot">
          {Demo ? <Demo.DemoControls variant="rail" /> : null}
          <ThemeSwitch />
          <button type="button" onClick={() => void signOut()}>
            <LogOut aria-hidden="true" />
            Sign out
          </button>
        </div>
      </nav>

      <div className="shell-main">
        <header className="hd" data-testid="shell-header">
          <ShopLockup
            className="hd-lockup"
            name={shopName}
            logoUrl={logoUrl}
            whaleClassName="hd-mark"
            whaleWidth={34}
            whaleHeight={18}
          />
          <div className="hd-name">
            <span>{shopName}</span>
            <div className="hd-meta">
              <small aria-live="off" data-testid="updated-ago">
              {updated ?? ' '}
            </small>
              {Demo ? <Demo.DemoChip inline /> : null}
            </div>
          </div>
          {Demo ? <Demo.DemoChip /> : null}
          {shop ? <ShopChip status={shop.status} /> : null}
        </header>
        {Demo ? <Demo.DemoHotkeys /> : null}
        {!online ? (
          <StaleBanner
            message={`Offline. Showing what we last saw${updated ? `, ${updated}` : ''}.`}
            onRetry={() => void qc.refetchQueries()}
          />
        ) : null}
        <main className="page" id="main">
          {children}
        </main>
      </div>

      <nav className="tb" aria-label="Main">
        {TAB_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          if (item.key === 'more') {
            const on = active === 'staff' || active === 'help';
            return (
              <button
                key="more"
                type="button"
                className={on ? 'on' : undefined}
                aria-haspopup="dialog"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen(true)}
              >
                <Icon aria-hidden="true" />
                More
              </button>
            );
          }
          const on = active === item.key;
          return (
            <Link key={item.key} href={item.href} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined}>
              <span className="tb-icon">
                <Icon aria-hidden="true" />
                <NavCount item={item} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="more-list">
          {MORE_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.icon];
            return (
              <Link key={item.key} href={item.href} onClick={() => setMoreOpen(false)}>
                <Icon aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
          <ThemeSwitch />
          <button type="button" onClick={() => void signOut()}>
            <LogOut aria-hidden="true" />
            Sign out
          </button>
        </div>
        <div style={{ marginTop: 16 }}>
          <InstallCard />
        </div>
        {Demo ? (
          <div style={{ marginTop: 16 }}>
            <Demo.DemoControls />
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
