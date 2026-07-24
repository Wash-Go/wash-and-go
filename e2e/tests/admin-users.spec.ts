import { expect, test } from '@playwright/test';
import { ADMIN_URL } from '../playwright.config';

/*
 * Browser smoke: the admin Users page (checkpoint O). Lists users, filters by
 * role, and grants + reverts a role through the real UI — the onboarding path
 * (a signed-in user gets promoted to a staff role).
 */
test.describe('admin users', () => {
  test('lists users and grants then reverts a role', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/users`);

    // Filter to a stable, seeded cohort.
    await page.getByLabel('Filter by role').selectOption('RIDER');

    const firstRow = page.locator('tr[data-testid^="user-"]').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    const rowId = await firstRow.getAttribute('data-testid');
    const id = rowId!.replace('user-', '');

    // Grant SHOP_STAFF and save.
    const staff = page.getByTestId(`role-${id}-SHOP_STAFF`);
    await staff.check();
    await page.getByTestId(`save-roles-${id}`).click();
    await expect(page.getByText('Roles updated')).toBeVisible({ timeout: 15_000 });

    // Revert so the smoke leaves no residue.
    await expect(page.getByTestId(`role-${id}-SHOP_STAFF`)).toBeChecked();
    await page.getByTestId(`role-${id}-SHOP_STAFF`).uncheck();
    await page.getByTestId(`save-roles-${id}`).click();
    await expect(page.getByText('Roles updated')).toBeVisible({ timeout: 15_000 });
  });
});
