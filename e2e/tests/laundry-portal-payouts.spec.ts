import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { API_URL } from '../playwright.config';
import { deleteSeededOrders } from '../fixtures/orders';

/*
 * Browser smoke: the laundry-portal Payouts screens (plan B5b). The design DB
 * has no payout batches, so beforeAll delivers one order at the Tetuan shop
 * (dev-shop-owner's) and closes a payout period around just that order's
 * line through the admin close endpoint. Run against a production build made
 * with `pnpm --filter @wash-and-go/e2e build:portal-e2e`.
 *
 * Cleanup: the API cannot delete a batch or un-deliver an order, so afterAll
 * deletes exactly the rows this run created with e2e/fixtures/orders.ts
 * (psql against E2E_DATABASE_URL). The narrow period means no other shop line
 * is ever batched.
 */
const seededOrders: string[] = [];
const seededBatches: string[] = [];

async function call<T>(method: string, path: string, uid: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'x-dev-uid': uid, ...(body != null ? { 'content-type': 'application/json' } : {}) },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
  return (res.status === 204 ? null : res.json()) as T;
}

type Batch = { id: string; totalPhp: string; lineCount: number };
let batch: Batch;
let code: string;

test.beforeAll(async () => {
  test.setTimeout(60_000);
  const shops = await call<{ id: string; name: string; services: { id: string }[] }[]>('GET', '/shops', 'dev-customer');
  const shop = shops.find((s) => /tetuan/i.test(s.name)) ?? shops[0];
  const order = await call<{ id: string; code: string }>('POST', '/orders', 'dev-customer', {
    shopServiceId: shop.services[0].id,
    pickupAddress: 'E2E payout pickup, Tetuan',
    pickupLat: 6.9111,
    pickupLng: 122.0794,
    loadCategory: 'S',
  });
  code = order.code;
  seededOrders.push(order.id);
  // If driving it fails part-way, afterAll still deletes the order.
  await deliver(order.id);
  const from = new Date(Date.now() - 5_000);
  await call('POST', `/orders/${order.id}/status`, 'dev-admin', { status: 'DELIVERED' });
  const to = new Date(Date.now() + 5_000);
  const closed = await call<Batch[]>('POST', '/admin/remittance/close', 'dev-admin', {
    periodStart: from.toISOString(),
    periodEnd: to.toISOString(),
    shopId: shop.id,
  });
  seededBatches.push(...closed.map((b) => b.id));
  expect(closed).toHaveLength(1);
  batch = closed[0];
});

test.afterAll(() => {
  deleteSeededOrders(seededOrders, seededBatches);
});

// BOOKED → … → OUT_FOR_RETURN, weighed at the shop on the way.
async function deliver(id: string) {
  const riders = await call<{ id: string }[]>('GET', '/riders', 'dev-admin');
  await call('POST', `/orders/${id}/assign-rider`, 'dev-admin', { riderId: riders[0].id });
  const step = (status: string) => call('POST', `/orders/${id}/status`, 'dev-admin', { status });
  await step('PICKED_UP');
  await step('AT_SHOP');
  // Weighing is a shop action (admins drive every status edge, but not weigh).
  await call('POST', `/orders/${id}/weigh`, 'dev-shop-owner', { weightKg: 3 });
  await step('PROCESSING');
  await step('READY_FOR_RETURN');
  await step('OUT_FOR_RETURN');
}

test('the pending card shows a peso amount and the batch lists', async ({ page }) => {
  await page.goto('/payouts');
  await expect(page.getByRole('heading', { level: 1, name: 'Payouts' })).toBeVisible();
  const pending = page.getByTestId('payouts-pending');
  await expect(pending).toContainText('Pending · not yet batched');
  await expect(pending.getByText(/^₱[\d,]+\.\d\d$/)).toBeVisible();
  await expect(page.getByTestId(`batch-${batch.id}`)).toContainText(`₱${Number(batch.totalPhp).toFixed(2)}`);
  await expect(page.getByTestId(`batch-${batch.id}`)).toContainText('Transfer pending');
  // The seeded Tetuan shop has no payout account: the owner is nudged to add one.
  const nudge = page.getByTestId('payout-nudge');
  await expect(nudge).toContainText('Add a payout account so ops can send your payouts.');
  await expect(nudge.getByRole('link', { name: 'Add a payout account' })).toHaveAttribute('href', '/shop');
});

test('batch list opens the detail, which downloads a CSV', async ({ page }) => {
  await page.goto('/payouts');
  await page.getByTestId(`batch-${batch.id}`).getByRole('link').click();
  await expect(page).toHaveURL(new RegExp(`/payouts/${batch.id}$`));
  const detail = page.getByTestId('payout-batch');
  await expect(detail.getByRole('heading', { level: 1 })).toContainText('Batch');
  await expect(detail.getByTestId(`line-${code}`)).toBeVisible();
  await expect(detail.getByTestId('batch-total')).toHaveText(/^₱[\d,]+\.\d\d$/);
  await expect(detail.getByTestId(`line-${code}`).getByRole('link', { name: code })).toHaveAttribute(
    'href',
    /\/orders\//,
  );

  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    detail.getByRole('button', { name: 'Download CSV' }).click(),
  ]);
  expect(dl.suggestedFilename()).toMatch(/^payout-\d{4}-\d\d-\d\d-\d{4}-\d\d-\d\d\.csv$/);
  const csv = readFileSync((await dl.path())!, 'utf8');
  const [header, ...rows] = csv.trimEnd().split('\r\n');
  expect(header).toBe('Order code,Delivered (Manila),Wash value (PHP),Commission (PHP),Payout (PHP)');
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatch(new RegExp(`^${code},\\d{4}-\\d\\d-\\d\\d \\d\\d:\\d\\d,\\d+\\.\\d\\d,\\d+\\.\\d\\d,\\d+\\.\\d\\d$`));
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('batches and lines become cards', async ({ page }) => {
    await page.goto('/payouts');
    const card = page.getByTestId(`batch-card-${batch.id}`);
    await expect(card).toBeVisible();
    await expect(page.getByTestId(`batch-${batch.id}`)).toBeHidden();
    await card.click();
    await expect(page).toHaveURL(new RegExp(`/payouts/${batch.id}$`));
    await expect(page.getByRole('link', { name: code })).toBeVisible();
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll).toBeLessThanOrEqual(client);
  });

  test('an unknown batch shows Batch not found with a way back', async ({ page }) => {
    await page.goto('/payouts/not-a-batch');
    await expect(page.getByRole('heading', { name: 'Batch not found' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to payouts' })).toHaveAttribute('href', '/payouts');
  });
});
