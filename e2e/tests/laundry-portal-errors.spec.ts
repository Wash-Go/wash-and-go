import { expect, test } from '@playwright/test';

/*
 * Browser smoke: the portal's error routes (plan B6). The not-a-shop screen is
 * in the shell spec, the branded offline page in the PWA spec; this covers an
 * unknown URL. Read-only.
 */
test.use({ viewport: { width: 390, height: 844 } });

test('an unknown URL shows the branded not-found page with a way back', async ({ page }) => {
  const res = await page.goto('/no-such-page');
  expect(res?.status()).toBe(404);
  const nf = page.getByTestId('not-found');
  await expect(nf.getByRole('heading', { level: 1, name: 'We can’t find that page' })).toBeVisible();
  await expect(nf.getByRole('img', { name: 'Wash & Go' })).toBeVisible();
  await nf.getByRole('link', { name: 'Open Orders' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Orders' })).toBeVisible();
});
