'use client';
import type { MeView, OwnerShopView } from '@wash-and-go/domain';
import { createContext, useContext } from 'react';
import type { Gate } from '../../lib/gate';

export type Console = {
  me: MeView;
  shop: OwnerShopView | null;
  gate: Gate;
  // Rebuilt from the offline gate snapshot, not a live answer.
  offline: boolean;
  email: string | null;
  refresh: () => Promise<unknown>;
  signOut: () => Promise<void>;
};

export const ConsoleCtx = createContext<Console | null>(null);

export function useConsole(): Console {
  const c = useContext(ConsoleCtx);
  if (!c) throw new Error('useConsole outside ConsoleGate');
  return c;
}
