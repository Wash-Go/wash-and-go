import { API_URL } from '../playwright.config';

/*
 * API seeding helpers for the browser smokes. Uses the x-dev-uid dev-bypass
 * (AUTH_DEV_BYPASS=1) to act as each seeded role without real tokens.
 */
async function call(
  method: string,
  path: string,
  devUid: string,
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-dev-uid': devUid },
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
    weightEstimateKg: 6,
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
