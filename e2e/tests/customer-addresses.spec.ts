import { expect, test } from '@playwright/test';
import { CUSTOMER_URL } from '../playwright.config';
import { customerLogin } from '../lib/customer';

/*
 * Browser smoke: the customer address book (was a "coming soon" stub). Adds a
 * saved address through the real UI and removes it, exercising the previously
 * unused create/delete endpoints end to end.
 */
test.describe('customer addresses', () => {
  test.setTimeout(120_000);

  test('adds and removes a saved address', async ({ page }) => {
    await customerLogin(page);
    await page.goto(`${CUSTOMER_URL}/addresses`);

    const line = `E2E Addr ${Date.now()}`;
    await expect(page.getByTestId('addr-line-input')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('addr-line-input').fill(line);
    await page.getByTestId('add-address').click();

    // The new address appears in the list.
    await expect(page.getByText(line)).toBeVisible({ timeout: 30_000 });

    // Remove it via its row's Remove action; it disappears.
    const row = page.locator('[data-testid^="address-"]', { hasText: line });
    await row.getByText('Remove').click();
    await expect(page.getByText(line)).toHaveCount(0, { timeout: 30_000 });
  });
});
