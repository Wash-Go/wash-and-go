import { expect, test } from '@playwright/test';
import { ADMIN_URL } from '../playwright.config';
import { cancelOrder, seedRiderCollectedCash } from '../lib/seed';

/*
 * Browser smoke: the admin rider-cash reconciliation page. Seeds a rider who
 * collected COD, then proves the real UI shows their outstanding balance and
 * that recording a deposit works (the button posts and the row updates).
 */
test.describe('admin rider-cash', () => {
  let riderId: string;
  let orderId: string;

  test.beforeAll(async () => {
    const seed = await seedRiderCollectedCash();
    riderId = seed.riderId;
    orderId = seed.orderId;
  });

  test.afterAll(async () => {
    if (orderId) await cancelOrder(orderId).catch(() => undefined);
  });

  test('shows a rider’s outstanding COD and records a deposit', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/rider-cash`);

    const row = page.getByTestId(`rider-cash-${riderId}`);
    await expect(row).toBeVisible();

    // Outstanding starts positive (collected, nothing deposited).
    const outstanding = row.locator('td').nth(3);
    const before = Number((await outstanding.innerText()).replace(/[^0-9.-]/g, ''));
    expect(before).toBeGreaterThan(0);

    // Record a ₱50 deposit through the UI.
    await row.getByPlaceholder('₱ amount').fill('50');
    await row.getByPlaceholder('ref').fill('E2E-DEP');
    await row.getByRole('button', { name: 'Deposit' }).click();

    // Toast confirms + the outstanding drops by 50 after the query refetches.
    await expect(page.getByText('Deposit recorded')).toBeVisible();
    await expect
      .poll(async () =>
        Number((await outstanding.innerText()).replace(/[^0-9.-]/g, '')),
      )
      .toBeCloseTo(before - 50, 2);
  });
});
