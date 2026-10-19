import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
import { API_URL } from '../playwright.config';

/*
 * Browser smoke: the laundry-portal onboarding wizard (plan B3). A fresh owner
 * registers a laundry through all six steps on a phone, the answers survive a
 * reload, they submit and see "We're checking your shop". Then ops rejects it
 * (Fix and resubmit opens the step the reason names) and verifies it (Orders
 * shows the one-time "You're live" banner).
 *
 * The dev x-dev-uid stub only works for users that already exist, and the API
 * has no way to create one without a Firebase token, so beforeAll inserts a
 * plain customer row straight into the local DB (E2E_DATABASE_URL, default the
 * design DB the local API runs on) and then starts onboarding through the API
 * (POST /shop/onboarding/start), exactly as signup does. afterAll removes it.
 * R2 is not configured locally, so the gated documents step is the one tested.
 */
const PHONE = { width: 390, height: 844 };
const DB = process.env.E2E_DATABASE_URL ?? 'postgresql://ban@localhost:5432/wash_and_go_design';
const UID = `e2e-onboard-${Date.now()}`;
const USER_ID = `usr_${UID}`;
const SHOP_NAME = `E2E Laundry ${Date.now() % 100000}`;

function sql(q: string): string {
  return execFileSync('psql', [DB, '-v', 'ON_ERROR_STOP=1', '-Atc', q]).toString().trim();
}

async function api(method: string, path: string, uid: string, body?: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'x-dev-uid': uid, ...(body != null ? { 'content-type': 'application/json' } : {}) },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

let shopId = '';

test.beforeAll(async () => {
  sql(
    `INSERT INTO "User" (id, "firebaseUid", phone, "displayName", roles) ` +
      `VALUES ('${USER_ID}', '${UID}', 'pending:${UID}', 'Lorna Onboard', '{CUSTOMER}')`,
  );
  const shop = (await api('POST', '/shop/onboarding/start', UID)) as { id: string; status: string };
  expect(shop.status).toBe('DRAFT');
  shopId = shop.id;
});

test.afterAll(async () => {
  if (shopId) {
    sql(`DELETE FROM "ShopService" WHERE "shopId" = '${shopId}'`);
    sql(`DELETE FROM "ShopMember" WHERE "shopId" = '${shopId}'`);
    sql(`DELETE FROM "Shop" WHERE id = '${shopId}'`);
  }
  // Verify / reject notify the owner.
  sql(`DELETE FROM "Notification" WHERE "userId" = '${USER_ID}'`);
  sql(`DELETE FROM "User" WHERE id = '${USER_ID}'`);
});

async function actAs(page: Page, uid: string) {
  await page.route(`${API_URL}/**`, (route) =>
    route.continue({ headers: { ...route.request().headers(), 'x-dev-uid': uid } }),
  );
}

const wizard = (page: Page) => page.getByTestId('wizard');
const next = (page: Page) => page.getByTestId('wizard-next');

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe.configure({ mode: 'serial' });

test.describe('onboarding wizard (phone)', () => {
  // The service worker's own fetches skip page.route, so the x-dev-uid rewrite
  // would be lost after a reload; the PWA spec covers the worker.
  test.use({ viewport: PHONE, serviceWorkers: 'block' });

  test('steps 1–2 validate, autosave and resume after a reload', async ({ page }) => {
    await actAs(page, UID);
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(wizard(page)).toHaveAttribute('data-step', '0');
    await expect(page.getByRole('heading', { name: 'Tell us about your laundry' })).toBeVisible();
    await expect(page.getByText('Step 1 of 6')).toBeVisible();

    // Inline validation with human copy; nothing saved.
    await next(page).click();
    await expect(page.getByText('Enter your laundry’s name.')).toBeVisible();
    await expect(page.getByText('Enter a PH mobile number, e.g. 0917 123 4567.')).toBeVisible();
    await expect(wizard(page)).toHaveAttribute('data-step', '0');

    await page.getByLabel('Laundry name').fill(SHOP_NAME);
    const phone = page.getByLabel('Contact phone');
    await phone.fill('0917 555 0101');
    expect(await phone.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
    await expect(phone).toHaveAttribute('type', 'tel');
    await page.getByLabel('Short description (optional)').fill('Family-run, beside the chapel.');
    await expect(page.getByText('30/500')).toBeVisible();
    await noHorizontalScroll(page);
    await next(page).click();

    await expect(page.getByRole('heading', { name: 'Where is your shop?' })).toBeVisible();
    await expect(page.getByText('Customers within your zone will see you.')).toBeVisible();
    await expect(page.getByText(/^saved /)).toBeVisible();

    // Autosaved: a reload resumes on Location.
    await page.reload();
    await expect(wizard(page)).toHaveAttribute('data-step', '1');
    const saved = (await api('GET', '/shop/onboarding', UID)) as { name: string; contactPhone: string; description: string };
    expect(saved).toMatchObject({ name: SHOP_NAME, contactPhone: '+639175550101', description: 'Family-run, beside the chapel.' });

    await next(page).click();
    await expect(page.getByText('Place the pin on your shop.')).toBeVisible();

    // Tap the map to drop the pin; the pin reverse-geocodes into the address line.
    const map = page.getByTestId('location-map');
    await expect(map.locator('.leaflet-container')).toBeVisible();
    const reverse = page.waitForResponse((r) => r.url().includes('/geocode/reverse'));
    await map.click();
    await expect(page.getByTestId('pin-coords')).toBeVisible();
    await reverse;
    await page.getByLabel('Address and landmark').fill('Don Alfaro St., Tetuan, beside the chapel');
    await noHorizontalScroll(page);
    await next(page).click();
    await expect(page.getByRole('heading', { name: 'What do you offer?' })).toBeVisible();
  });

  test('steps 3–4 save rates, hours and Express slots', async ({ page }) => {
    await actAs(page, UID);
    await page.goto('/onboarding');
    await expect(wizard(page)).toHaveAttribute('data-step', '2');

    await next(page).click();
    await expect(page.getByText('Turn on at least one service.')).toBeVisible();

    await page.getByTestId('svc-toggle-WDF').check();
    const wdf = page.getByTestId('svc-WDF');
    await wdf.getByLabel('Rate per kg').fill('25');
    await wdf.getByLabel('Turnaround (hours)').fill('24');
    await expect(page.getByTestId('price-example')).toHaveText('Customers see: 6 kg wash, dry & fold = ₱150.00 + delivery');
    await noHorizontalScroll(page);
    await next(page).click();

    await expect(page.getByRole('heading', { name: 'When are you open?' })).toBeVisible();
    await page.getByLabel('Monday opens').fill('07:30');
    await page.getByLabel('Monday closes').fill('19:00');
    await page.getByRole('button', { name: 'Copy Monday to weekdays' }).click();
    await expect(page.getByLabel('Friday opens')).toHaveValue('07:30');
    await page.getByLabel('Open on Saturday').uncheck();
    // open < close, inline.
    await page.getByLabel('Wednesday closes').fill('06:00');
    await page.getByLabel('Express slots per day').fill('4');
    await next(page).click();
    await expect(page.getByTestId('day-3').getByText('Closing time must be after opening time.')).toBeVisible();
    await page.getByLabel('Wednesday closes').fill('19:00');
    await noHorizontalScroll(page);
    await next(page).click();

    // Gated documents step (R2 off locally): allowed to go on.
    await expect(page.getByRole('heading', { name: 'Your documents' })).toBeVisible();
    await expect(page.getByText('Document upload isn’t open yet; our team will verify in person.')).toBeVisible();

    const saved = (await api('GET', '/shop/onboarding', UID)) as {
      hours: { day: number; open: string | null; close: string | null }[];
      expressSlotsPerDay: number;
    };
    expect(saved.expressSlotsPerDay).toBe(4);
    expect(saved.hours[1]).toEqual({ day: 1, open: '07:30', close: '19:00' });
    expect(saved.hours[5]).toEqual({ day: 5, open: '07:30', close: '19:00' });
    expect(saved.hours[6]).toEqual({ day: 6, open: null, close: null });
    const services = (await api('GET', '/shop/services', UID)) as { code: string; ratePhp: string; active: boolean }[];
    expect(services).toEqual([expect.objectContaining({ code: 'WDF', ratePhp: '25.00', active: true })]);
  });

  test('step 6 reviews and submits; the owner sees Under review', async ({ page }) => {
    await actAs(page, UID);
    await page.goto('/onboarding');
    // Everything saved, documents gated → resume lands on Review.
    await expect(wizard(page)).toHaveAttribute('data-step', '5');
    await expect(page.getByRole('heading', { name: 'Check and submit' })).toBeVisible();
    await expect(page.getByTestId('summary-0')).toContainText(SHOP_NAME);
    await expect(page.getByTestId('summary-0')).toContainText('0917 555 0101');
    await expect(page.getByTestId('summary-2')).toContainText('₱25.00 / kg');
    await expect(page.getByTestId('summary-3')).toContainText('Mon–Fri');

    // Edit jumps to the step and comes back to review.
    await page.getByRole('button', { name: 'Edit hours and capacity' }).click();
    await expect(page.getByRole('heading', { name: 'When are you open?' })).toBeVisible();
    await next(page).click();
    await expect(page.getByRole('heading', { name: 'Check and submit' })).toBeVisible();

    await next(page).click();
    await expect(page.getByText('Tick the box to confirm your details are accurate.')).toBeVisible();
    await page.getByTestId('accurate').check();
    await noHorizontalScroll(page);
    await next(page).click();

    await expect(page.getByRole('heading', { name: 'We’re checking your shop' })).toBeVisible();
    await expect(page.getByText('Under review')).toBeVisible();
    await expect(page.getByText('We’ll check your permit in person.')).toBeVisible();
    await page.getByRole('button', { name: 'See what you submitted' }).click();
    await expect(page.getByTestId('summary-1')).toContainText('Don Alfaro St.');
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.locator('nav.tb')).toHaveCount(0);
  });

  test('a rejection reopens the wizard at the step the reason names', async ({ page }) => {
    await api('POST', `/admin/shops/${shopId}/reject`, 'dev-admin', { reason: 'Your map location is in the sea.' });
    await actAs(page, UID);
    await page.goto('/onboarding');
    await expect(page.getByRole('heading', { name: 'Your application needs changes' })).toBeVisible();
    await expect(page.getByText('Your map location is in the sea.')).toBeVisible();
    await page.getByRole('button', { name: 'Fix and resubmit' }).click();
    await expect(page.getByRole('heading', { name: 'Where is your shop?' })).toBeVisible();
    await expect(page.getByLabel('Address and landmark')).toHaveValue('Don Alfaro St., Tetuan, beside the chapel');
  });

  test('once verified, Orders shows a one-time You’re live banner', async ({ page }) => {
    await api('POST', '/shop/onboarding/submit', UID);
    await api('POST', `/admin/shops/${shopId}/verify`, 'dev-admin');
    await actAs(page, UID);
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/$/);
    const banner = page.getByTestId('live-banner');
    await expect(banner).toContainText('You’re live.');
    await banner.getByRole('button', { name: 'Dismiss' }).click();
    await expect(banner).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('orders-queue')).toBeVisible();
    await expect(page.getByTestId('live-banner')).toHaveCount(0);
  });
});
