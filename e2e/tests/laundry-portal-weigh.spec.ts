import { expect, test } from '@playwright/test';
import { cancelOrder, seedAtShopOrder } from '../lib/seed';

/*
 * Browser smoke: the laundry-portal weigh flow — the launch-critical path where a
 * shop turns a picked-up order into a priced, processing one. Proves the real
 * buttons work: the order shows in the queue, Preview price recomputes, Confirm
 * weigh-in persists, and the status action advances the order.
 */
test.describe('laundry-portal weigh flow', () => {
  let orderId: string;
  let code: string;

  test.beforeAll(async () => {
    const o = await seedAtShopOrder();
    orderId = o.id;
    code = o.code;
  });

  test.afterAll(async () => {
    if (orderId) await cancelOrder(orderId).catch(() => undefined);
  });

  test('weighs an at-shop order and advances it', async ({ page }) => {
    await page.goto('/');

    // Scope every interaction to the seeded order's card — the queue may hold
    // other orders, so single-element locators would be ambiguous.
    const card = page.getByTestId(`order-${code}`);
    await expect(card).toBeVisible();

    // Enter the actual weight and preview the recomputed price.
    await card.getByPlaceholder('Actual kg').fill('7');
    await card.getByRole('button', { name: 'Preview price' }).click();

    // Preview succeeded → the confirm button appears with the recomputed total.
    const confirm = card.getByRole('button', { name: 'Confirm weigh-in' });
    await expect(confirm).toBeVisible();

    // Confirm the weigh-in — the card should now read as weighed.
    await confirm.click();
    await expect(card.getByText(/Weighed 7/i)).toBeVisible();

    // A status action is now available (AT_SHOP → PROCESSING, labelled "Washing")
    // and advances the order.
    const toWashing = card.getByRole('button', { name: /Mark Washing/i });
    await expect(toWashing).toBeVisible();
    await toWashing.click();
    await expect(card.getByText('Washing', { exact: true })).toBeVisible();
  });
});
