'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { MeView, OwnerShopView } from '@wash-and-go/domain';
import { api } from '../../lib/api';
import { claimApiCache } from '../../lib/cache-owner-effect';
import { sessionUid } from '../../lib/cache-owner';
import { DEV_UID } from '../../lib/firebase';
import { isShopAccount, resolveGate, type Gate } from '../../lib/gate';
import { gateRedirect } from '../../lib/gate-route';
import { readGateSnapshot, saveGateSnapshot, snapshotAllowed, type GateSnapshot } from '../../lib/offline-gate';
import { ensureSession } from '../../lib/session';
import { signOutEverywhere } from '../../lib/sign-out';
import { useAuth } from '../../lib/useAuth';
import { AppShell } from '../ui/AppShell';
import { ErrorState } from '../ui/ErrorState';
import { useToast } from '../ui/Toast';
import { ConsoleCtx, type Console } from './ConsoleContext';
import { NotAShop } from './NotAShop';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// No HTTP status = the request never got an answer (offline, DNS, timeout).
const isNetworkError = (e: unknown) => typeof (e as { status?: unknown } | null)?.status !== 'number';

type Boot = { me: MeView; shop: OwnerShopView | null; gate: Gate; offline: boolean };

function snapshotOf(uid: string, me: MeView, shop: OwnerShopView | null, gate: Gate): GateSnapshot {
  return {
    uid,
    kind: gate.kind,
    shopName: shop?.name ?? null,
    shopStatus: shop?.status ?? null,
    owner: me.roles.includes('SHOP_OWNER'),
  };
}

// Offline: rebuild just enough of the gate from the snapshot (same uid only)
// for the shell and the onboarding screen. The view is marked offline.
function fromSnapshot(snap: GateSnapshot): Boot {
  const shop: OwnerShopView | null = snap.shopStatus
    ? {
        id: '',
        name: snap.shopName ?? '',
        address: '',
        lat: '0',
        lng: '0',
        status: snap.shopStatus,
        rejectionReason: null,
        permitKey: null,
        photoKeys: [],
        submittedAt: null,
        verifiedAt: null,
        contactPhone: null,
        description: null,
        hours: null,
        expressSlotsPerDay: 0,
        documentsPending: false,
        logoKey: null,
        logoUrl: null,
      }
    : null;
  const me: MeView = { id: '', phone: null, displayName: '', roles: [snap.owner ? 'SHOP_OWNER' : 'SHOP_STAFF'] };
  const gate: Gate = snap.kind === 'not-a-shop' ? { kind: 'not-a-shop' } : { kind: snap.kind, shop };
  return { me, shop, gate, offline: true };
}

function Loading() {
  return (
    <div className="center-fill" role="status">
      Loading your shop…
    </div>
  );
}

// Everything behind sign-in. Order: Firebase user (or the dev x-dev-uid stub)
// → make sure the DB user exists (POST /auth/session) → GET /auth/me →
// GET /shop/onboarding → resolveGate decides: not-a-shop screen, onboarding,
// or the console shell. The shop always comes from the API (ShopMember of the
// caller); nothing here sends a shopId.
export function ConsoleGate({ children }: { children: ReactNode }) {
  const { user, loading, devBypass } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const toast = useToast();
  const signedIn = devBypass || !!user;
  const uid = sessionUid(user, DEV_UID);

  useEffect(() => {
    if (!loading && !signedIn) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, signedIn, pathname, router]);

  const boot = useQuery<Boot>({
    queryKey: ['boot', uid],
    enabled: !loading && signedIn && !!uid,
    // An offline answer is refetched as soon as the connection is back.
    staleTime: (q) => (q.state.data?.offline ? 0 : 30_000),
    refetchInterval: false,
    // Retry real server errors once; a network error goes straight to the
    // offline snapshot or the error state (offlineFirst would pause it forever).
    retry: (n, e) => n < 1 && !isNetworkError(e),
    queryFn: async () => {
      const id = uid!;
      // Before anything can be read from the service worker's API cache.
      await claimApiCache(id);
      try {
        // Idempotent upsert. Not fatal: a real auth problem fails /auth/me below.
        const session = await ensureSession(user, api);
        if (!session.ok) {
          console.error('[auth] POST /auth/session failed', session.error);
          if (navigator.onLine) toast.show({ tone: 'error', title: session.message });
        }
        // In parallel to save a round trip on a phone; the onboarding answer
        // only counts for shop roles (others may get an error, ignored).
        const onboarding = api.getMyShopOnboarding().then(
          (v) => ({ ok: true as const, v }),
          (e: unknown) => ({ ok: false as const, e }),
        );
        const me = await api.getMe();
        let shop: OwnerShopView | null = null;
        if (isShopAccount(me.roles)) {
          const r = await onboarding;
          if (!r.ok) throw r.e;
          shop = r.v;
        }
        const gate = resolveGate(me.roles, shop);
        saveGateSnapshot(storage(), snapshotOf(id, me, shop, gate));
        return { me, shop, gate, offline: false };
      } catch (e) {
        const snap = snapshotAllowed(e, navigator.onLine) ? readGateSnapshot(storage(), id) : null;
        if (snap) return fromSnapshot(snap);
        throw e;
      }
    },
  });

  const gate = boot.data?.gate ?? null;

  // The previous gate kind, so an accepted invite (not-a-shop → ready) lands
  // on Orders from whatever URL the not-a-shop screen was showing.
  const lastKind = useRef<Gate['kind'] | null>(null);
  useEffect(() => {
    if (!gate) return;
    const to = gateRedirect(lastKind.current, gate.kind, pathname);
    lastKind.current = gate.kind;
    if (to) router.replace(to);
  }, [gate?.kind, pathname, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = useCallback(async () => {
    await signOutEverywhere(qc);
    router.replace('/login');
  }, [qc, router]);

  const value = useMemo<Console | null>(
    () =>
      boot.data && gate
        ? {
            me: boot.data.me,
            shop: boot.data.shop,
            gate,
            offline: boot.data.offline,
            email: user?.email ?? null,
            refresh: () => boot.refetch(),
            signOut,
          }
        : null,
    [boot.data, gate, user?.email, signOut], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (loading || !signedIn) return <Loading />;
  if (boot.isError && !boot.data) {
    return (
      <div className="gate-wrap">
        <div className="gate">
          <ErrorState
            title="We couldn't open your shop."
            body="Check your connection, then try again. If it keeps happening, sign out and back in."
            onRetry={() => void boot.refetch()}
          />
          <button type="button" className="btn btn-secondary full" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </div>
    );
  }
  if (!value || !gate) return <Loading />;

  let body: ReactNode;
  if (gate.kind === 'not-a-shop') body = <NotAShop />;
  else if (gate.kind === 'onboarding') body = pathname === '/onboarding' ? children : <Loading />;
  else body = pathname === '/onboarding' ? <Loading /> : <AppShell>{children}</AppShell>;

  return <ConsoleCtx.Provider value={value}>{body}</ConsoleCtx.Provider>;
}
