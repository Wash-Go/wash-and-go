import { API_URL } from '../playwright.config';

/*
 * API seeding helpers for the browser smokes. Uses the x-dev-uid dev-bypass
 * (AUTH_DEV_BYPASS=1) to act as each seeded role without real tokens.
 *
 * The customer app is the exception: it signs in with a real Firebase account,
 * and the API lets a real token win over x-dev-uid. So data the customer app
 * must see (its saved addresses) is seeded as that account, with the session's
 * own ID token ({ token }), not as the seeded dev-customer.
 */
type Caller = string | { token: string };

async function call(
  method: string,
  path: string,
  as: Caller,
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    // content-type only with a body — Fastify 500s on empty json bodies.
    headers: {
      ...(typeof as === 'string'
        ? { 'x-dev-uid': as }
        : { authorization: `Bearer ${as.token}` }),
      ...(body != null ? { 'content-type': 'application/json' } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

type Shop = {
  id: string;
  name: string;
  services: { id: string }[];
};

// Central Zamboanga — inside the coverage polygon.
const PICKUP = { pickupLat: 6.9111, pickupLng: 122.0794 };

/*
 * Creates an order and drives it (as admin, who can drive every edge) to
 * AT_SHOP at the Tetuan shop — the shop dev-shop-owner belongs to, so the portal
 * queue shows it. Returns the order code the smoke asserts against.
 */
export async function seedAtShopOrder(): Promise<{ id: string; code: string }> {
  const shops = (await call('GET', '/shops', 'dev-customer')) as Shop[];
  const tetuan = shops.find((s) => /tetuan/i.test(s.name)) ?? shops[0];
  const shopServiceId = tetuan.services[0]?.id;
  if (!shopServiceId) throw new Error('No shop service to seed against');

  const order = (await call('POST', '/orders', 'dev-customer', {
    shopServiceId,
    pickupAddress: 'E2E pickup, Tetuan',
    ...PICKUP,
    loadCategory: 'M', // 6kg estimate
  })) as { id: string; code: string };

  // BOOKED → ASSIGNED → PICKED_UP → AT_SHOP, all driven by admin.
  const riders = (await call('GET', '/riders', 'dev-admin')) as { id: string }[];
  await call('POST', `/orders/${order.id}/assign-rider`, 'dev-admin', {
    riderId: riders[0].id,
  });
  await call('POST', `/orders/${order.id}/status`, 'dev-admin', {
    status: 'PICKED_UP',
  });
  await call('POST', `/orders/${order.id}/status`, 'dev-admin', {
    status: 'AT_SHOP',
  });

  return { id: order.id, code: order.code };
}

// Cancel + tidy so repeated smokes don't pile up open orders in the queue.
export async function cancelOrder(id: string): Promise<void> {
  await call('POST', `/orders/${id}/status`, 'dev-admin', { status: 'CANCELLED' });
}

// A fresh BOOKED (unassigned) order — for the admin dispatch/assign smoke.
export async function seedBookedOrder(): Promise<{ id: string; code: string }> {
  const shops = (await call('GET', '/shops', 'dev-customer')) as Shop[];
  const shopServiceId = shops[0].services[0]?.id;
  if (!shopServiceId) throw new Error('No shop service to seed against');
  const order = (await call('POST', '/orders', 'dev-customer', {
    shopServiceId,
    pickupAddress: 'E2E dispatch pickup',
    ...PICKUP,
    loadCategory: 'M', // 6kg estimate
  })) as { id: string; code: string };
  return order;
}

// An order ASSIGNED to a named rider (default "Rider One" = dev-rider-1), so the
// rider app board shows it with a "Mark picked up" action. For the rider smoke.
export async function seedAssignedToRider(
  riderName = 'Rider One',
): Promise<{ id: string; code: string; riderId: string }> {
  const order = await seedBookedOrder();
  const riders = (await call('GET', '/riders', 'dev-admin')) as {
    id: string;
    displayName: string;
  }[];
  const rider = riders.find((r) => r.displayName === riderName) ?? riders[0];
  await call('POST', `/orders/${order.id}/assign-rider`, 'dev-admin', {
    riderId: rider.id,
  });
  return { ...order, riderId: rider.id };
}

// Cancel the signed-in customer's own open orders (the list is scoped to the
// token's user), as admin — who can cancel from any status. Cleanup for the
// customer confirm-booking path. Scoped on purpose: an "every open order"
// sweep would also cancel other users' orders in a shared dev database.
export async function cancelOpenOrdersOf(token: string): Promise<void> {
  const orders = (await call('GET', '/orders?limit=100', { token })) as {
    id: string;
    status: string;
  }[];
  const open = orders.filter(
    (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED',
  );
  for (const o of open) {
    await call('POST', `/orders/${o.id}/status`, 'dev-admin', {
      status: 'CANCELLED',
    }).catch(() => undefined);
  }
}

export type SavedAddress = { id: string; label: string | null; line: string };

/*
 * Adds a saved pickup address to the signed-in customer's address book. The
 * booking and address screens pick locations on a map (react-native-webview),
 * which does not render on Expo web, so a smoke books from a saved address
 * seeded here instead. Pair with deleteSavedAddress in cleanup.
 */
export async function seedSavedAddress(
  token: string,
  input: { label: string; line: string; lat: number; lng: number },
): Promise<SavedAddress> {
  return (await call('POST', '/me/addresses', { token }, input)) as SavedAddress;
}

export async function deleteSavedAddress(token: string, id: string): Promise<void> {
  await call('DELETE', `/me/addresses/${id}`, { token });
}

// Delete any zones with the given name (smoke cleanup).
export async function deleteZonesNamed(name: string): Promise<void> {
  const zones = (await call('GET', '/admin/zones', 'dev-admin')) as {
    id: string;
    name: string;
  }[];
  for (const z of zones.filter((z) => z.name === name)) {
    await call('DELETE', `/admin/zones/${z.id}`, 'dev-admin');
  }
}

/*
 * Seeds a rider who has collected COD: create an order, assign a rider, and
 * record the cash payment (admin) so the rider's collected total > 0 and they
 * appear in the rider-cash summary. Returns the rider + the amount collected.
 */
export async function seedRiderCollectedCash(): Promise<{
  riderId: string;
  riderName: string;
  orderId: string;
  totalPhp: string;
}> {
  const shops = (await call('GET', '/shops', 'dev-customer')) as Shop[];
  const shopServiceId = shops[0].services[0]?.id;
  if (!shopServiceId) throw new Error('No shop service to seed against');

  const order = (await call('POST', '/orders', 'dev-customer', {
    shopServiceId,
    pickupAddress: 'E2E COD pickup',
    ...PICKUP,
    loadCategory: 'M', // 6kg estimate
  })) as { id: string; customerTotalPhp: string };

  const riders = (await call('GET', '/riders', 'dev-admin')) as {
    id: string;
    displayName: string;
  }[];
  const rider = riders[0];
  await call('POST', `/orders/${order.id}/assign-rider`, 'dev-admin', {
    riderId: rider.id,
  });
  await call('POST', `/orders/${order.id}/pay-cash`, 'dev-admin');

  return {
    riderId: rider.id,
    riderName: rider.displayName,
    orderId: order.id,
    totalPhp: order.customerTotalPhp,
  };
}
