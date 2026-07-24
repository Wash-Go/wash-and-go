import { expect, test } from '@playwright/test';
import { ADMIN_URL } from '../playwright.config';

/*
 * Browser smoke: the admin Shops page (checkpoint C — shop onboarding). Creates
 * a shop through the real UI, opens it, prices a catalog service, then
 * deactivates the shop to leave the seed roughly as it was.
 */
test.describe('admin shops', () => {
  test('creates a shop, prices a service, then deactivates it', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/shops`);

    const name = `Smoke Laundry ${Date.now()}`;
    await page.getByLabel('Shop name').fill(name);
    await page.getByLabel('Shop address').fill('Smoke St, Zamboanga');
    await page.getByLabel('Latitude').fill('6.9100');
    await page.getByLabel('Longitude').fill('122.0790');
    await page.getByTestId('create-shop').click();
    await expect(page.getByText('Shop created')).toBeVisible({ timeout: 15_000 });

    // The new shop shows up in the list; open its management drawer.
    const row = page.locator('tr[data-testid^="shop-"]').filter({ hasText: name }).first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    const shopId = (await row.getAttribute('data-testid'))!.replace('shop-', '');

    await page.getByTestId(`manage-${shopId}`).click();

    // Price the first catalog service.
    const select = page.getByTestId(`add-service-select-${shopId}`);
    await expect(select).toBeVisible({ timeout: 15_000 });
    const firstOpt = await select.locator('option').nth(1).getAttribute('value');
    await select.selectOption(firstOpt!);
    await page.getByLabel('Rate').fill('130');
    await page.getByLabel('Turnaround hours').fill('24');
    await page.getByTestId(`add-service-${shopId}`).click();
    await expect(page.getByText('Service added')).toBeVisible({ timeout: 15_000 });

    // Deactivate to keep the active-shop set stable for other smokes.
    await page.getByTestId(`toggle-active-${shopId}`).click();
    await expect(page.getByText('Shop deactivated')).toBeVisible({ timeout: 15_000 });
  });
});
