'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { api } from '../../lib/api';
import { isShopAccount, resolveGate } from '../../lib/gate';
import { ensureSession } from '../../lib/session';
import { signOutEverywhere } from '../../lib/sign-out';
import { useAuth } from '../../lib/useAuth';
import { AppShell } from '../ui/AppShell';
import { ErrorState } from '../ui/ErrorState';
import { useToast } from '../ui/Toast';
import { ConsoleCtx, type Console } from './ConsoleContext';
import { NotAShop } from './NotAShop';

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

  useEffect(() => {
    if (!loading && !signedIn) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, signedIn, pathname, router]);

  const boot = useQuery({
    queryKey: ['boot', user?.uid ?? 'dev'],
    enabled: !loading && signedIn,
    staleTime: 30_000,
    refetchInterval: false,
    retry: 1,
    queryFn: async () => {
      // Idempotent upsert. Not fatal: offline, /auth/me may still come from the
      // service worker cache, and any real auth problem fails /auth/me below.
      const session = await ensureSession(user, api);
      if (!session.ok) {
        console.error('[auth] POST /auth/session failed', session.error);
        if (typeof navigator === 'undefined' || navigator.onLine) toast.show({ tone: 'error', title: session.message });
      }
      const me = await api.getMe();
      const shop = isShopAccount(me.roles) ? await api.getMyShopOnboarding() : null;
      return { me, shop };
    },
  });

  const gate = boot.data ? resolveGate(boot.data.me.roles, boot.data.shop) : null;

  useEffect(() => {
    if (!gate) return;
    if (gate.kind === 'onboarding' && pathname !== '/onboarding') router.replace('/onboarding');
    if (gate.kind === 'ready' && pathname === '/onboarding') router.replace('/');
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
