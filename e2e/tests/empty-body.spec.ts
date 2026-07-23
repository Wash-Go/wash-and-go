import { expect, test } from '@playwright/test';
import { API_URL } from '../playwright.config';
import { cancelOrder, seedRiderCollectedCash } from '../lib/seed';

/*
 * Regression for the empty-body class: a POST that sends
 * `content-type: application/json` with NO body used to 500 in Fastify's parser
 * before Nest could handle it. The server now treats an empty json body as
 * "no body". This hits the wire directly (not through the fixed api-client), so
 * it guards the SERVER fix, not just client discipline.
 */
test('empty application/json body on a no-body POST does not 500', async ({ request }) => {
  const seed = await seedRiderCollectedCash();
  try {
    // Explicitly the broken shape: content-type json, empty body. pay-cash is
    // idempotent, so re-calling on the already-paid order is safe.
    const res = await request.post(`${API_URL}/orders/${seed.orderId}/pay-cash`, {
      headers: { 'x-dev-uid': 'dev-admin', 'content-type': 'application/json' },
      // no data → empty body
    });
    expect(res.status()).not.toBe(500);
    expect(res.ok()).toBeTruthy();
  } finally {
    await cancelOrder(seed.orderId).catch(() => undefined);
  }
});
