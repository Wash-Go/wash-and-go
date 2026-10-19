import { expect, test } from '@playwright/test';
import { cancelOrder, seedAtShopOrder } from '../lib/seed';

/*
 * Browser smoke: the laundry-portal weigh flow — the launch-critical path where a
 * shop turns a picked-up order into a priced, processing one. Proves the real
 * buttons work: the order shows in Needs you, the weigh sheet prices the entered
 * weight live, "Confirm ₱…" persists it, and the status action advances the
 * order into the Washing tab.
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

    // Open the weigh sheet and enter the actual weight; the price is live.
    await card.getByRole('button', { name: 'Weigh' }).click();
    const sheet = page.getByRole('dialog', { name: new RegExp(`Order ${code.slice(-4)}`) });
    await sheet.getByLabel('Weight on the scale').fill('7');
    await expect(sheet.getByTestId('breakdown')).toContainText('Customer pays');

    // The confirm button names the outcome with the recomputed total.
    const confirm = sheet.getByRole('button', { name: /^Confirm ₱/ });
    await expect(confirm).toBeEnabled();

    // Confirm the weigh-in — the card should now read as weighed.
    await confirm.click();
    await expect(sheet).toBeHidden();
    await expect(card.getByText(/Weighed 7/i)).toBeVisible();

    // The next step is now the primary action (AT_SHOP → PROCESSING) and
    // advances the order into the Washing tab.
    const toWashing = card.getByRole('button', { name: /Mark washing/i });
    await expect(toWashing).toBeVisible();
    await toWashing.click();
    await expect(card).toBeHidden();
    await page.getByRole('tab', { name: /Washing/ }).click();
    await expect(card.getByText('Washing', { exact: true })).toBeVisible();
  });
});
