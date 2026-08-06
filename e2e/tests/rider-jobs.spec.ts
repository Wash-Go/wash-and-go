import { expect, test } from '@playwright/test';
import { RIDER_URL } from '../playwright.config';
import { cancelOrder, seedAssignedToRider } from '../lib/seed';

/*
 * Browser smoke: the rider app job board. Seeds an order assigned to Rider One
 * and proves the rider (dev-uid stub, no login) sees it with the correct next
 * action the status machine computed.
 */
test.describe('rider jobs', () => {
  test.setTimeout(120_000);
  let orderId: string;
  let code: string;

  test.beforeAll(async () => {
    const o = await seedAssignedToRider('Rider One');
    orderId = o.id;
    code = o.code;
  });
  test.afterAll(async () => {
    if (orderId) await cancelOrder(orderId).catch(() => undefined);
  });

  test('shows the assigned job with its next action', async ({ page }) => {
    await page.goto(RIDER_URL);
    await expect(page.getByText(code)).toBeVisible({ timeout: 60_000 });
    // ASSIGNED → the rider's next step is to pick it up.
    await expect(page.getByText('Mark picked up').first()).toBeVisible();
  });
});
