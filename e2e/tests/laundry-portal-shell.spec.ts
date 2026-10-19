import { expect, test, type Page } from '@playwright/test';
import { API_URL } from '../playwright.config';

/*
 * Browser smoke: the laundry-portal brand shell (plan B1). Runs against the dev
 * server with the x-dev-uid stub (dev-shop-owner, owner of the VERIFIED Tetuan
 * shop). Other accounts are simulated by rewriting the stub header on the API
 * requests, so the gate's not-a-shop and onboarding branches are covered too.
 */
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

async function noHorizontalScroll(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, 'page scrolls sideways').toBeLessThanOrEqual(client);
}

// Act as another seeded account: swap the x-dev-uid header on API calls.
async function actAs(page: Page, uid: string) {
  await page.route(`${API_URL}/**`, (route) =>
    route.continue({ headers: { ...route.request().headers(), 'x-dev-uid': uid } }),
  );
}

test.describe('laundry-portal shell (phone)', () => {
  test.use({ viewport: PHONE });

  test('renders the header and the five bottom tabs', async ({ page }) => {
    await page.goto('/');
    const header = page.getByTestId('shell-header');
    await expect(header.getByText('Tetuan Laundry Hub')).toBeVisible();
    await expect(header.getByText('Verified')).toBeVisible();

    const tabs = page.locator('nav.tb');
    await expect(tabs).toBeVisible();
    for (const name of ['Orders', 'Services', 'Payouts', 'Shop', 'More']) {
      await expect(tabs.getByRole(name === 'More' ? 'button' : 'link', { name })).toBeVisible();
    }
    await expect(tabs.getByRole('link', { name: 'Orders' })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('nav.rail')).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();
    await expect(header.getByTestId('updated-ago')).toHaveText(/updated/);
    await noHorizontalScroll(page);
  });

  for (const [path, heading, tab] of [
    ['/services', 'Services & rates', 'Services'],
    ['/payouts', 'Payouts', 'Payouts'],
    ['/shop', 'Shop', 'Shop'],
    ['/staff', 'Staff', null],
    ['/help', 'Help', null],
  ] as const) {
    test(`route ${path} loads inside the shell`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.getByTestId('shell-header')).toBeVisible();
      if (tab) {
        await expect(page.locator('nav.tb').getByRole('link', { name: tab })).toHaveAttribute('aria-current', 'page');
      }
      // Services and Help are still stubs; Payouts, Shop and Staff are real screens now.
      if (path === '/services' || path === '/help') await expect(page.getByTestId('empty-state')).toBeVisible();
      await noHorizontalScroll(page);
    });
  }

  test('More opens a sheet with Staff, Help and Sign out', async ({ page }) => {
    await page.goto('/');
    await page.locator('nav.tb').getByRole('button', { name: 'More' }).click();
    const sheet = page.getByRole('dialog', { name: 'More' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'Staff' })).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await sheet.getByRole('link', { name: 'Help' }).click();
    await expect(page).toHaveURL(/\/help$/);
    await expect(sheet).toBeHidden();
  });

  test('login renders at 390 without sideways scroll', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to your shop' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Wash & Go' })).toBeVisible();
    const pw = page.getByLabel('Password', { exact: true });
    await pw.fill('secret123');
    await expect(pw).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(pw).toHaveAttribute('type', 'text');
    await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Register your laundry' })).toHaveAttribute('href', '/signup');
    // 16px inputs: iOS never zooms.
    expect(await pw.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
    await noHorizontalScroll(page);
  });

  test('Forgot password without an email asks for one first', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await expect(page.getByText('Type your email above first, then tap Forgot password.')).toBeVisible();
  });

  test('signup validates the form in place', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Register your laundry' })).toBeVisible();
    await page.getByLabel('Mobile number').fill('12345');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Enter a Philippine mobile number, like 0917 123 4567.')).toBeVisible();
    await expect(page.getByText('Enter your name.')).toBeVisible();
    await noHorizontalScroll(page);
  });

  test('a customer account sees the not-a-shop screen', async ({ page }) => {
    await actAs(page, 'dev-customer');
    await page.goto('/');
    const gate = page.getByTestId('not-a-shop');
    await expect(gate.getByRole('heading', { name: 'This console is for partner laundries' })).toBeVisible();
    await expect(gate.getByRole('button', { name: 'Register your laundry' })).toBeVisible();
    await expect(gate.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.locator('nav.tb')).toHaveCount(0);
    await noHorizontalScroll(page);
  });

  test('an owner whose shop is under review lands on onboarding', async ({ page }) => {
    await actAs(page, 'dev-pending-owner');
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole('heading', { name: 'We’re checking your shop' })).toBeVisible();
    await expect(page.getByText('Under review')).toBeVisible();
    await expect(page.locator('nav.tb')).toHaveCount(0);
  });
});

test.describe('laundry-portal shell (desktop)', () => {
  test.use({ viewport: DESKTOP });

  test('swaps the tab bar for the left rail with Staff, Help and Sign out', async ({ page }) => {
    await page.goto('/payouts');
    const rail = page.locator('nav.rail');
    await expect(rail).toBeVisible();
    for (const name of ['Orders', 'Services', 'Payouts', 'Shop', 'Staff', 'Help']) {
      await expect(rail.getByRole('link', { name })).toBeVisible();
    }
    await expect(rail.getByRole('link', { name: 'Payouts' })).toHaveAttribute('aria-current', 'page');
    await expect(rail.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.locator('nav.tb')).toBeHidden();
    await rail.getByRole('link', { name: 'Staff' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Staff' })).toBeVisible();
  });
});
