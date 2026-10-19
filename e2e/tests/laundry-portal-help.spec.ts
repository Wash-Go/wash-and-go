import { expect, test } from '@playwright/test';

/*
 * Browser smoke: the laundry-portal Help page (plan B6). Read-only: nothing to
 * seed or clean up. Runs as the dev-shop-owner stub.
 */
test.describe('help (phone)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('explains the order flow, weigh-in, payouts, contact and version', async ({ page }) => {
    await page.goto('/help');
    const help = page.getByTestId('help');
    await expect(help.getByRole('heading', { level: 1, name: 'Help' })).toBeVisible();
    for (const h of ['How an order moves', 'Weigh-in rules', 'How payouts work', 'Contact ops', 'Your account']) {
      await expect(help.getByRole('heading', { level: 2, name: h })).toBeVisible();
    }
    // One chip per status, the shop's own steps marked "Needs you".
    await expect(help.locator('.help-steps li')).toHaveCount(9);
    await expect(help.locator('.help-steps').getByText('Needs you')).toHaveCount(2);
    await expect(help.getByText(/most one order can weigh is 50 kg/)).toBeVisible();
    await expect(help.getByText(/approval/i)).toHaveCount(0);
    // Ops contact is clearly a placeholder until the founders provide it.
    await expect(help.getByTestId('help-contact').getByText('Placeholder', { exact: true })).toBeVisible();
    await expect(help.getByTestId('help-contact').getByRole('link', { name: /0917/ })).toHaveAttribute('href', /^tel:/);
    await expect(help.getByTestId('help-email')).toContainText('developer stub');
    await expect(help.getByTestId('help-version')).toHaveText(/^Version \d+\.\d+\.\d+( · build \w{7})?$/);
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll).toBeLessThanOrEqual(client);
  });
});
