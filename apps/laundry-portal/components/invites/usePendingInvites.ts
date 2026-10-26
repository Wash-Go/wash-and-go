'use client';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useConsole } from '../console/ConsoleContext';
import { api } from '../../lib/api';
import { shouldFetchPendingInvites } from '../../lib/invites';
import { useAuth } from '../../lib/useAuth';

const DISMISS_KEY = 'wg-portal-invites-dismissed';

export const pendingInvitesKey = (uid: string) => ['pending-invites', uid] as const;

function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

// GET /shop/invites/pending, only when the account has a verified email on
// file (never for the dev stub). Not polled: the boot refresh after "I've
// verified" or an accept refetches it.
export function usePendingInvites() {
  const { me } = useConsole();
  const { devBypass } = useAuth();
  const enabled = shouldFetchPendingInvites({
    devBypass,
    inviteEmailOnFile: me.inviteEmailOnFile,
    emailVerified: me.emailVerified,
  });
  return useQuery({
    queryKey: pendingInvitesKey(me.id),
    queryFn: () => api.pendingInvites(),
    enabled,
    refetchInterval: false,
    staleTime: 60_000,
    retry: false,
  });
}

// "Not now" lasts for this browser session.
export function useDismissedInvites(): [string[], (id: string) => void] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = session()?.getItem(DISMISS_KEY);
      if (raw) setIds(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);
  const dismiss = useCallback((id: string) => {
    setIds((old) => {
      const next = [...old, id];
      try {
        session()?.setItem(DISMISS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  return [ids, dismiss];
}
