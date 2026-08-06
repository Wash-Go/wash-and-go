import { expect, test } from '@playwright/test';
import { ADMIN_URL } from '../playwright.config';
import { deleteZonesNamed } from '../lib/seed';

const ZONE_NAME = 'E2E Test Zone';

/*
 * Browser smoke: the admin zones editor. Proves the create form works (name +
 * boundary points → the zone appears in the list) and the activate/deactivate
 * toggle drives the real endpoint.
 */
test.describe('admin zones', () => {
  test.beforeEach(async () => {
    await deleteZonesNamed(ZONE_NAME).catch(() => undefined);
  });
  test.afterEach(async () => {
    await deleteZonesNamed(ZONE_NAME).catch(() => undefined);
  });

  test('creates a zone from boundary points and toggles it', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/zones`);

    // Fill the create form (a square around Tetuan).
    await page.getByPlaceholder('Zone name (e.g. Tetuan)').fill(ZONE_NAME);
    await page
      .getByLabel('Zone boundary points')
      .fill('6.88, 122.05\n6.88, 122.11\n6.94, 122.11\n6.94, 122.05');
    // The parsed-point count confirms parsing worked before we submit (the form
    // shows exactly "4 points"; zone cards read "N points · Active").
    await expect(page.getByText('4 points', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Create zone' }).click();
    await expect(page.getByText('Zone created')).toBeVisible();

    // The new zone shows in the list as Active.
    const card = page.locator('[data-testid^="zone-"]', { hasText: ZONE_NAME });
    await expect(card).toBeVisible();
    await expect(card.getByText('Active', { exact: true })).toBeVisible();

    // Let the create's refetch settle so it can't race over the toggle.
    await page.waitForLoadState('networkidle');

    // Toggle it inactive — the toast confirms the mutation, then the status flips.
    await card.getByRole('button', { name: 'Deactivate' }).click();
    await expect(page.getByText('Zone deactivated')).toBeVisible();
    await expect(card.getByText('Inactive', { exact: true })).toBeVisible();
  });
});
