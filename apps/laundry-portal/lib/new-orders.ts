// New-order ring (plan A3 flow 3): an order id first seen on a later poll gets
// the sky ring + "New" tag for 60 s and lands at the top. The first load after
// boot only records what is already there, so opening the app never rings.
// Pure: the caller feeds it the ids of each poll and the clock.

export const NEW_RING_MS = 60_000;

export interface NewOrdersState {
  // null until the first poll has been recorded.
  seen: readonly string[] | null;
  // id → when it was first seen (ms), while its ring lasts.
  fresh: Readonly<Record<string, number>>;
}

export const emptyNewOrders: NewOrdersState = { seen: null, fresh: {} };

export function trackNewOrders(
  state: NewOrdersState,
  ids: readonly string[],
  now: number,
): { state: NewOrdersState; arrived: string[] } {
  if (state.seen == null) return { state: { seen: [...ids], fresh: {} }, arrived: [] };
  const seen = new Set(state.seen);
  const arrived = ids.filter((id) => !seen.has(id));
  const fresh: Record<string, number> = {};
  let expired = false;
  for (const [id, at] of Object.entries(state.fresh)) {
    if (now - at < NEW_RING_MS) fresh[id] = at;
    else expired = true;
  }
  if (!arrived.length && !expired) return { state, arrived };
  for (const id of arrived) fresh[id] = now;
  // Seen grows (an order that leaves the list and comes back never rings
  // twice); bounded by the shop's own orders over a session.
  return { state: { seen: [...state.seen, ...arrived], fresh }, arrived };
}

export function isNewOrder(state: NewOrdersState, id: string, now: number): boolean {
  const at = state.fresh[id];
  return at != null && now - at < NEW_RING_MS;
}
