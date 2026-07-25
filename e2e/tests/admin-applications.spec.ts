import { expect, test } from '@playwright/test';
import { ADMIN_URL } from '../playwright.config';

/*
 * Browser smoke: the admin shop-verification review queue (onboarding C). The
 * seed leaves one SUBMITTED shop ("Ayala Suds (pending)"). Asserts it renders
 * with the approve path + a working reject form. Non-mutating (doesn't approve/
 * reject) so it stays idempotent across runs without a reseed.
 */
test.describe('admin applications', () => {
  test('shows a submitted shop with approve + reject controls', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/applications`);

    const card = page.locator('div[data-testid^="app-"]').filter({ hasText: 'Ayala Suds' }).first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    const id = (await card.getAttribute('data-testid'))!.replace('app-', '');

    // Location + proof affordances present.
    await expect(card.getByText(/view on map/i)).toBeVisible();
    await expect(card.getByText(/view permit|no permit/i)).toBeVisible();

    // Approve button is there (we don't click it — would drain the queue).
    await expect(page.getByTestId(`verify-${id}`)).toBeVisible();

    // Reject opens an inline reason form, then cancels cleanly.
    await page.getByTestId(`reject-open-${id}`).click();
    const reason = page.getByLabel('Rejection reason');
    await expect(reason).toBeVisible();
    await reason.fill('needs a clearer permit photo');
    await expect(page.getByTestId(`reject-${id}`)).toBeEnabled();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(reason).toBeHidden();
  });
});
