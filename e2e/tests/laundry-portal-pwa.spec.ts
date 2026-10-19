import { expect, test } from '@playwright/test';

/*
 * PWA smoke for the laundry portal (plan B1). The service worker only exists
 * in a production build, so this runs against `next build && next start`, not
 * the dev server. Skipped unless PORTAL_PROD_URL points at one:
 *
 *   NEXT_PUBLIC_API_URL=http://localhost:4000 NEXT_PUBLIC_DEV_UID=dev-shop-owner \
 *     pnpm --filter @wash-and-go/laundry-portal build
 *   pnpm --filter @wash-and-go/laundry-portal exec next start -p 3012
 *   PORTAL_PROD_URL=http://localhost:3012 pnpm --filter @wash-and-go/e2e exec playwright test --config playwright.pwa.config.ts
 *
 * NEXT_PUBLIC_DEV_UID is for this local test build only (the x-dev-uid stub
 * needs API AUTH_DEV_BYPASS=1); never set it on a deployed build.
 */
const PROD = process.env.PORTAL_PROD_URL;
test.skip(!PROD, 'PORTAL_PROD_URL not set (needs a production build)');
test.use({ baseURL: PROD, viewport: { width: 390, height: 844 } });

async function swReady(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.scriptURL ?? null;
  });
}

test('serves the web manifest', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m).toMatchObject({
    name: 'Wash & Go Partner',
    short_name: 'Wash & Go',
    display: 'standalone',
    theme_color: '#0B3773',
    background_color: '#FFFFFF',
  });
  const purposes = (m.icons as { sizes: string; purpose: string }[]).map((i) => `${i.sizes}:${i.purpose}`);
  expect(purposes).toEqual(expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']));
  for (const icon of m.icons as { src: string }[]) expect((await request.get(icon.src)).ok()).toBe(true);
});

test('links the manifest and the apple touch icon', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0B3773');
});

test('registers the service worker', async ({ page }) => {
  await page.goto('/login');
  expect(await swReady(page)).toMatch(/\/sw\.js\?api=/);
});

test('serves the branded offline page for a page never opened online', async ({ page, context }) => {
  await page.goto('/login');
  await swReady(page);
  await context.setOffline(true);
  await page.goto('/staff');
  await expect(page.getByTestId('offline-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'You’re offline' })).toBeVisible();
  await context.setOffline(false);
});

test('shows the last-seen queue offline behind the stale banner', async ({ page, context }) => {
  await page.goto('/');
  await swReady(page);
  // Second load runs under the service worker, so the page and the API GETs
  // are cached network-first.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();
  await expect(page.getByTestId('shell-header')).toContainText('Tetuan Laundry Hub');
  // The queue loads (the dev DB holds orders seeded by the weigh smoke).
  await expect(page.locator('[data-testid^="order-"]').first()).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('stale-banner')).toContainText('Offline');
  await expect(page.getByTestId('shell-header')).toContainText('Tetuan Laundry Hub');
  await expect(page.locator('[data-testid^="order-"]').first()).toBeVisible();
  await context.setOffline(false);
});

test('caches API GETs network-first and never caches writes', async ({ page }) => {
  await page.goto('/');
  await swReady(page);
  await page.reload(); // now controlled: the queue GETs go through the worker
  const keys = () =>
    page.evaluate(async () => {
      const cache = await caches.open('wg-api');
      return (await cache.keys()).map((r) => `${r.method} ${new URL(r.url).pathname}`);
    });
  await expect.poll(keys).toContain('GET /orders');
  // A write through the worker (it fails validation; what matters is it is not stored).
  await page.evaluate(async (api) => {
    await fetch(`${api}/orders/preview`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-dev-uid': 'dev-shop-owner' },
      body: JSON.stringify({}),
    }).catch(() => undefined);
  }, process.env.API_URL ?? 'http://localhost:4000');
  const after = await keys();
  expect(after.length).toBeGreaterThan(0);
  expect(after.every((k) => k.startsWith('GET '))).toBe(true);
  expect(after).not.toContain('GET /orders/preview');
});
