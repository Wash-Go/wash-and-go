import { expect, test } from '@playwright/test';
import { ADMIN_URL } from '../playwright.config';
import { cancelOrder, seedBookedOrder } from '../lib/seed';

/*
 * Browser smoke: the admin dispatch board's exception action — assigning a rider
 * to a booked order. Seeds a BOOKED order, picks a rider in the row, clicks
 * Assign, and proves the order picks up the rider.
 */
test.describe('admin dispatch', () => {
  let orderId: string;
  let code: string;

  test.beforeAll(async () => {
    const o = await seedBookedOrder();
    orderId = o.id;
    code = o.code;
  });
  test.afterAll(async () => {
    if (orderId) await cancelOrder(orderId).catch(() => undefined);
  });

  test('assigns a rider to a booked order', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/`);

    const row = page.locator('tr', { hasText: code });
    await expect(row).toBeVisible({ timeout: 30_000 });

    // Pick a rider and assign.
    await row.locator('select').selectOption({ label: 'Rider One' });
    await row.getByRole('button', { name: 'Assign' }).click();

    // After assign, the order carries the rider (the assign cell is gone).
    await expect(row.getByText('Rider One')).toBeVisible({ timeout: 15_000 });
  });
});
