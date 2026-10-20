import { expect, test, type Page } from '@playwright/test';
import { cancelOrder, seedAtShopOrder } from '../lib/seed';
import { deleteSeededOrders } from '../fixtures/orders';

/*
 * Browser smoke: the laundry-portal Orders queue (plan B2). Runs as the
 * dev-shop-owner stub against the local API. Seeds its own at-shop orders and
 * deletes them afterwards (e2e/fixtures/orders.ts), so it does not depend on
 * what else is in the queue.
 */
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

const seeded: { id: string; code: string }[] = [];

test.beforeAll(async () => {
  seeded.push(await seedAtShopOrder(), await seedAtShopOrder());
});

test.afterAll(async () => {
  deleteSeededOrders(seeded.map((o) => o.id));
});

const queue = (page: Page) => page.getByTestId('orders-queue');

test.describe('orders queue (phone)', () => {
  test.use({ viewport: PHONE });

  test('renders the four tabs with counts and the badge', async ({ page }) => {
    await page.goto('/');
    const tabs = queue(page).getByRole('tablist', { name: 'Order status' });
    for (const name of ['Needs you', 'Washing', 'Ready', 'Done']) {
      await expect(tabs.getByRole('tab', { name: new RegExp(`^${name}`) })).toBeVisible();
    }
    await expect(tabs.getByRole('tab', { name: /^Needs you/ })).toHaveAttribute('aria-selected', 'true');
    // Active counts are exact; Done is fetched (and counted) once its tab opens.
    for (const key of ['needs', 'washing', 'ready']) {
      await expect(page.getByTestId(`count-${key}`)).toHaveText(/^\d+$/);
    }
    await expect(page.getByTestId('count-done')).toHaveCount(0);
    const needs = Number(await page.getByTestId('count-needs').textContent());
    expect(needs).toBeGreaterThanOrEqual(2);
    // Tab title and the Orders tab carry the Needs-you count.
    await expect(page).toHaveTitle(`(${needs}) Orders · Wash & Go`);
    await expect(page.locator('nav.tb').getByTestId('nav-needs-count')).toContainText(String(needs));
    // Each card has exactly one action: Weigh, for an unweighed at-shop order.
    const card = page.getByTestId(`order-${seeded[0].code}`);
    await expect(card.getByRole('button')).toHaveCount(1);
    await expect(card.getByRole('button', { name: 'Weigh' })).toBeVisible();
    await expect(card.getByText('Needs you')).toBeVisible();
  });

  test('reads active orders in one page and Done by status', async ({ page }) => {
    const lists: string[] = [];
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (u.pathname === '/orders' && r.method() === 'GET') lists.push(u.search);
    });
    await page.goto('/');
    await expect(page.getByTestId(`order-${seeded[0].code}`)).toBeVisible();
    expect(lists.some((s) => s.includes('active=true') && s.includes('limit=200'))).toBe(true);
    // No unfiltered newest-N list: an old active order can't fall off it.
    expect(lists.every((s) => s.includes('active=true') || s.includes('status='))).toBe(true);
    await expect(page.getByTestId('active-truncated')).toHaveCount(0);

    await page.getByRole('tab', { name: /^Done/ }).click();
    await expect(page.getByTestId('count-done')).toHaveText(/^\d+\+?$/);
    await expect(page.locator('article.oc').first()).toBeVisible();
    await expect(page.locator('article.oc').first().getByText(/Delivered|Cancelled/)).toBeVisible();
  });

  test('Load more on Done pages older orders with the before cursor', async ({ page }) => {
    // ?donePage=3 shrinks the Done page (a test hook, only in builds made with
    // NEXT_PUBLIC_E2E=1: `build:portal-e2e` or the dev webServer) so the design DB's
    // done orders fill more than one page without seeding 100+ of them.
    // Four cancelled orders of its own (deleted in afterAll with the rest), so
    // the cancelled list alone spans more than one 3-order page even on a
    // freshly cleaned DB (Done pages DELIVERED and CANCELLED separately).
    for (let i = 0; i < 4; i++) {
      const o = await seedAtShopOrder(); // at the owner's shop (Tetuan)
      seeded.push(o);
      await cancelOrder(o.id);
    }
    const before: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('before=')) before.push(r.url());
    });
    await page.goto('/?tab=done&donePage=3');
    const rows = page.locator('article.oc');
    await expect(page.getByTestId('count-done')).toHaveText(/^\d+\+$/);
    const firstCount = await rows.count();
    expect(firstCount).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Load more' }).click();
    await expect.poll(() => rows.count()).toBeGreaterThan(firstCount);
    expect(before.length).toBeGreaterThan(0);
    expect(before.every((u) => /status=(DELIVERED|CANCELLED)/.test(u) && u.includes('limit=3'))).toBe(true);
  });

  test('says so when the active page comes back full', async ({ page }) => {
    // Pad the real active page to the 200-order limit.
    await page.route(/\/orders\?.*active=true/, async (route) => {
      const res = await route.fetch();
      const real = (await res.json()) as { id: string; code: string }[];
      const padded = Array.from({ length: 200 }, (_, i) => ({
        ...real[i % real.length],
        id: `pad-${i}`,
        code: `WG-2099-${String(i).padStart(6, '0')}`,
      }));
      await route.fulfill({ response: res, json: padded });
    });
    await page.goto('/');
    await expect(page.getByTestId('active-truncated')).toContainText('Showing the oldest 200 active orders');
  });

  test('search by order code narrows the list', async ({ page }) => {
    await page.goto('/');
    const [a, b] = seeded;
    await expect(page.getByTestId(`order-${a.code}`)).toBeVisible();
    await expect(page.getByTestId(`order-${b.code}`)).toBeVisible();
    const activeCalls: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('active=true')) activeCalls.push(r.url());
    });
    await page.getByRole('searchbox', { name: 'Search by order code' }).fill(a.code.slice(-6));
    await expect(page.getByTestId(`order-${b.code}`)).toBeHidden();
    // Search filters the one polled active list; it never polls a second one.
    expect(activeCalls.every((u) => !u.includes('q='))).toBe(true);
    await expect(page.getByTestId(`order-${a.code}`)).toBeVisible();
    await expect(page.getByTestId('count-needs')).toHaveText('1');
    await page.getByRole('searchbox', { name: 'Search by order code' }).fill('');
    await expect(page.getByTestId(`order-${b.code}`)).toBeVisible();
  });

  test('a card opens the detail route and back returns to the queue', async ({ page }) => {
    const [a] = seeded;
    await page.goto('/');
    await page.getByTestId(`order-${a.code}`).getByRole('link', { name: `Order ${a.code}` }).click();
    await expect(page).toHaveURL(new RegExp(`/orders/${a.id}$`));
    const detail = page.getByTestId('order-detail');
    await expect(detail).toContainText(a.code);
    await expect(detail.getByText('At your shop')).toBeVisible();
    await expect(detail.getByTestId('breakdown')).toContainText('Customer pays');
    await expect(detail.getByRole('button', { name: 'Weigh' })).toBeVisible();
    await detail.getByRole('link', { name: 'Orders' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId(`order-${a.code}`)).toBeVisible();
  });

  test('an unknown order shows Order not found with a way back', async ({ page }) => {
    await page.goto('/orders/not-a-real-order');
    await expect(page.getByRole('heading', { name: 'Order not found' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to orders' })).toHaveAttribute('href', '/');
  });

  test('the weigh sheet prices live and names the total on Confirm', async ({ page }) => {
    const [, b] = seeded;
    await page.goto('/');
    await page.getByTestId(`order-${b.code}`).getByRole('button', { name: 'Weigh' }).click();
    const sheet = page.getByRole('dialog', { name: new RegExp(`Order ${b.code.slice(-4)}`) });
    const kg = sheet.getByLabel('Weight on the scale');
    await expect(kg).toHaveAttribute('inputmode', 'decimal');
    await kg.fill('6.5');
    await expect(sheet.getByTestId('breakdown')).toContainText('6.5 kg');
    await expect(sheet.getByTestId('breakdown')).toContainText('Customer pays');
    await expect(sheet.getByTestId('weigh-delta')).toContainText('0.5 kg more than the ~6 kg estimate');
    await expect(sheet.getByRole('button', { name: /^Confirm ₱\d[\d,]*\.\d\d$/ })).toBeEnabled();
    await expect(sheet.getByText(/approval/i)).toHaveCount(0);

    // Far over the estimate: a second confirm before it becomes a bill.
    await kg.fill('20');
    const confirm = sheet.getByRole('button', { name: /^Confirm ₱/ });
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(sheet.getByRole('button', { name: /^Yes, confirm ₱/ })).toBeVisible();
    await expect(sheet.getByText('Check the scale shows 20 kg, not 2 kg, before you confirm.')).toBeVisible();
    await sheet.getByRole('button', { name: 'Change the weight' }).click();
    await expect(kg).toHaveValue('20');

    // Over the 50 kg cap: no price, no confirm.
    await kg.fill('51');
    await expect(sheet.getByText('Enter a weight above 0 kg and no more than 50 kg.')).toBeVisible();
    await expect(sheet.getByRole('button', { name: /^Confirm/ })).toBeDisabled();
    // Keyboard, not a pointer: next dev's corner badge can sit over the button.
    await sheet.getByRole('button', { name: 'Cancel' }).press('Enter');
    await expect(sheet).toBeHidden();
  });

  test('the chime toggle is remembered across a reload', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByTestId('chime-toggle');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.getByTestId('chime-toggle')).toHaveAttribute('aria-pressed', 'true');
    // After a reload the browser needs a fresh gesture before it may play.
    await expect(page.getByTestId('chime-waiting')).toBeVisible();
    await page.getByTestId('chime-toggle').click();
    await expect(page.getByTestId('chime-toggle')).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => localStorage.getItem('wg-portal-chime'))).toBe('0');
  });

  test('an order that lands after the first load gets the New ring', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await expect(page.getByTestId(`order-${seeded[0].code}`)).toBeVisible();
    // Orders already there on boot never ring.
    await expect(page.getByTestId(`order-${seeded[0].code}`).getByText('New', { exact: true })).toHaveCount(0);
    const fresh = await seedAtShopOrder();
    seeded.push(fresh);
    const card = page.getByTestId(`order-${fresh.code}`);
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(card.getByText('New', { exact: true })).toBeVisible();
    await expect(card).toHaveClass(/oc-new/);
  });
});

test.describe('orders queue (desktop)', () => {
  test.use({ viewport: DESKTOP });

  test('a card opens the detail in the side panel', async ({ page }) => {
    const [a] = seeded;
    await page.goto('/');
    await page.getByTestId(`order-${a.code}`).getByRole('link', { name: `Order ${a.code}` }).click();
    const panel = page.getByRole('dialog', { name: `Order ${a.code.slice(-4)}` });
    await expect(panel.getByTestId('order-detail')).toContainText(a.code);
    await expect(page).toHaveURL(/\/$/);
    // While the panel holds the primary action, cards drop to secondary.
    await expect(page.getByTestId(`order-${a.code}`).getByRole('button', { name: 'Weigh' })).toHaveClass(/btn-secondary/);
    await expect(panel.getByRole('link', { name: 'Open the full page' })).toHaveAttribute('href', `/orders/${a.id}`);
  });
});
