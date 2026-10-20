import { expect, test, type Page } from '@playwright/test';
import { DEMO_URL } from '../playwright.demo.config';

/*
 * Browser smoke: the standalone demo build (B10), no API and no Firebase.
 * Every test starts from a fresh browser context, so the demo state
 * (localStorage) is re-seeded each time.
 */
const PHONE = { width: 390, height: 844 };
const OWNER = 'demo.owner@washandgo.ph';
const STAFF = 'staff.demo@washandgo.ph';

async function signIn(page: Page, email = OWNER) {
  await page.goto('/login');
  await expect(page.getByTestId('demo-chip')).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Orders' })).toBeVisible({ timeout: 15_000 });
}

const count = (page: Page, tab: string) => page.getByTestId(`count-${tab}`);

test.describe('demo (phone)', () => {
  test.use({ viewport: PHONE });

  test('the owner signs in with the prefilled email and sees the demo queue', async ({ page }) => {
    const outside: string[] = [];
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (u.origin !== new URL(DEMO_URL).origin && !u.protocol.startsWith('data') && !u.protocol.startsWith('blob')) {
        outside.push(r.url());
      }
    });
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toHaveValue(OWNER);
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await expect(page.getByText('Password reset is not available in the demo.')).toBeVisible();
    await page.getByLabel('Password', { exact: true }).fill('abc');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Enter any password of 4 or more characters.')).toBeVisible();
    await page.getByLabel('Password', { exact: true }).fill('demo');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Orders' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('shell-header')).toContainText('Wash & Go');
    await expect(page.getByTestId('demo-data-chip')).toBeVisible();
    await expect(count(page, 'needs')).toHaveText('2');
    await expect(count(page, 'washing')).toHaveText('2');
    await expect(count(page, 'ready')).toHaveText('1');
    await expect(page.getByTestId('incoming')).toContainText('Incoming (2)');
    // Nothing left the browser: no API, no Firebase, no third party.
    expect(outside).toEqual([]);
  });

  test('weigh the Large order through the second confirm, then mark it washing', async ({ page }) => {
    await signIn(page);
    // Pin the card by its code: its text changes once weighed.
    const testId = await page.locator('article.oc', { hasText: 'Large (~9 kg)' }).getAttribute('data-testid');
    const card = page.getByTestId(testId!);
    await card.getByRole('button', { name: 'Weigh' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByLabel('Weight on the scale').fill('20');
    await expect(sheet.getByTestId('breakdown')).toContainText('20 kg × ₱25.00');
    await sheet.getByRole('button', { name: /^Confirm ₱/ }).click();
    await expect(sheet.getByText('Check the scale shows 20 kg, not 2 kg, before you confirm.')).toBeVisible();
    await sheet.getByRole('button', { name: /^Yes, confirm ₱5\d\d\.\d\d$/ }).click();
    await expect(sheet).toBeHidden();
    await expect(card).toContainText('Weighed 20 kg');
    await card.getByRole('button', { name: 'Mark washing' }).click();
    await expect(count(page, 'washing')).toHaveText('3');
    await expect(count(page, 'needs')).toHaveText('1');
  });

  test('payouts show the pending total and the paid batch reference', async ({ page }) => {
    await signIn(page);
    await page.goto('/payouts');
    const pending = page.getByTestId('payouts-pending');
    await expect(pending.getByText(/^₱[\d,]+\.\d\d$/)).toBeVisible();
    await expect(pending).toContainText('2 delivered orders not yet batched');
    await expect(page.getByTestId('batch-card-batch-paid')).toContainText('GCASH-DEMO-0001');
    await expect(page.getByTestId('batch-card-batch-pending')).toContainText('Transfer pending');
  });

  test('a service rate edit persists after a reload; sign-out and back in keeps it', async ({ page }) => {
    await signIn(page);
    await page.goto('/services');
    const rate = page.getByTestId('svc-WDF').getByLabel('Rate per kg');
    await expect(rate).toHaveValue('25.00');
    await rate.fill('27.50');
    await page.getByTestId('services-save').click();
    await expect(page.getByText('Rates saved.')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('svc-WDF').getByLabel('Rate per kg')).toHaveValue('27.50');

    await page.locator('nav.tb').getByRole('button', { name: 'More' }).click();
    await page.getByRole('dialog', { name: 'More' }).getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/);
    await signIn(page);
    await page.goto('/services');
    await expect(page.getByTestId('svc-WDF').getByLabel('Rate per kg')).toHaveValue('27.50');
  });

  test('"New order arrives" adds a Needs-you card; reset restores the counts', async ({ page }) => {
    await signIn(page);
    await page.locator('nav.tb').getByRole('button', { name: 'More' }).click();
    await page.getByTestId('demo-controls').getByRole('button', { name: 'New order arrives' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('incoming')).toContainText('Incoming (3)', { timeout: 15_000 });
    await expect(count(page, 'needs')).toHaveText('3', { timeout: 60_000 });
    await expect(page.locator('article.oc-new').first()).toContainText('New');
    await expect(page.locator('nav.tb').getByTestId('nav-needs-count')).toContainText('3');

    await page.locator('nav.tb').getByRole('button', { name: 'More' }).click();
    await page.getByTestId('demo-controls').getByRole('button', { name: 'Reset demo' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reset demo' }).click();
    await expect(page.getByText('Demo reset.')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(count(page, 'needs')).toHaveText('2', { timeout: 15_000 });
    await expect(count(page, 'washing')).toHaveText('2');
  });

  test('the staff login is read-only for rates and the team', async ({ page }) => {
    await signIn(page, STAFF);
    await page.goto('/services');
    await expect(page.getByText('Ask the owner to change rates.')).toBeVisible();
    await expect(page.getByTestId('services-save')).toHaveCount(0);
    await expect(page.getByTestId('services-page').getByRole('textbox')).toHaveCount(0);
    await page.goto('/staff');
    await expect(page.getByRole('heading', { level: 1, name: 'Staff' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Invite by email' })).toHaveCount(0);
  });

  test('signup explains it is not available in the demo', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByTestId('demo-signup')).toContainText('Signing up is not available in the demo.');
  });
});

test.describe('demo (desktop)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('the rail has the demo controls and Shift+N books an order', async ({ page }) => {
    await signIn(page);
    const rail = page.getByTestId('demo-controls-rail');
    await expect(rail.getByRole('button', { name: 'New order arrives' })).toBeVisible();
    await expect(page.getByTestId('demo-data-chip')).toHaveText('Demo data');
    await page.keyboard.press('Shift+N');
    await expect(page.getByText('A new order is on its way.')).toBeVisible();
    await expect(page.getByTestId('incoming')).toContainText('Incoming (3)', { timeout: 15_000 });
  });
});
