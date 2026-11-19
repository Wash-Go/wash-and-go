'use client';
import { addLiveOrder, route, type DemoRole } from './router';
import { loadState, saveState, seedState, type DemoState } from './store';
import { DEMO_EMAILS } from './fixture';

// Browser side of the demo build (B10): the one in-memory copy of the demo
// state (persisted to localStorage), the demo session, and the fetchFn the
// ApiClient uses. Only ever loaded when NEXT_PUBLIC_DEMO is '1'.

export const DEMO_API_BASE = 'https://demo-api.washandgo.invalid';
const SESSION_KEY = 'wg-demo-session';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

let state: DemoState | null = null;
function current(now: number): DemoState {
  if (!state) state = loadState(storage(), now);
  return state;
}
function commit(next: DemoState) {
  state = next;
  saveState(storage(), next);
}

// --- session ---
const listeners = new Set<() => void>();
export function getDemoRole(): DemoRole | null {
  try {
    const v = storage()?.getItem(SESSION_KEY);
    return v === 'owner' || v === 'staff' ? v : null;
  } catch {
    return null;
  }
}
export function setDemoRole(role: DemoRole | null): void {
  try {
    if (role) storage()?.setItem(SESSION_KEY, role);
    else storage()?.removeItem(SESSION_KEY);
  } catch {
    // session lasts for this page only
  }
  listeners.forEach((l) => l());
}
export function subscribeDemoRole(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function demoEmailFor(role: DemoRole | null): string | null {
  return role ? DEMO_EMAILS[role] : null;
}

// --- controls ---
export function demoNewOrder(): void {
  const now = Date.now();
  commit(addLiveOrder(current(now), now));
}
export function demoReset(): void {
  commit(seedState(Date.now()));
}

// --- fetch ---
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// API calls never leave the browser: URLs on DEMO_API_BASE go to the router
// after 150-400 ms (so loading states show); anything else is a real fetch.
export async function demoFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (!url.startsWith(DEMO_API_BASE)) return fetch(input, init);
  await sleep(150 + Math.random() * 250);
  const now = Date.now();
  const before = current(now);
  let body: unknown;
  try {
    body = init?.body ? JSON.parse(String(init.body)) : undefined;
  } catch {
    body = undefined;
  }
  const { state: next, res } = route(before, {
    method: init?.method ?? 'GET',
    path: url.slice(DEMO_API_BASE.length) || '/',
    body,
    role: getDemoRole(),
    now,
  });
  if (next !== before) commit(next);
  return new Response(res.json === undefined ? null : JSON.stringify(res.json), {
    status: res.status,
    headers: { 'content-type': 'application/json' },
  });
}
