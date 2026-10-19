import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';

/*
 * Browser smoke: the laundry-portal Services & rates page (plan A4
 * "Services"), as the dev-shop-owner stub (owner of the seeded Tetuan Laundry
 * Hub) against a production build and the local API. The owner edits the
 * wash, dry & fold rate and it survives a reload.
 *
 * beforeAll snapshots the shop's ShopService rows with psql (E2E_DATABASE_URL,
 * default the design DB the local API runs on); afterAll puts every saved
 * rate, turnaround and on/off back and deletes any row the spec created.
 */
const PHONE = { width: 390, height: 844 };
const DB = process.env.E2E_DATABASE_URL ?? 'postgresql://ban@localhost:5432/wash_and_go_design';

function sql(q: string): string {
  return execFileSync('psql', [DB, '-v', 'ON_ERROR_STOP=1', '-Atc', q]).toString().trim();
}

let shopId = '';
let saved: { id: string; rate: string; hours: string; active: string }[] = [];

test.beforeAll(() => {
  shopId = sql(
    `SELECT s.id FROM "Shop" s JOIN "ShopMember" m ON m."shopId" = s.id JOIN "User" u ON u.id = m."userId" ` +
      `WHERE u."firebaseUid" = 'dev-shop-owner' AND m.role = 'OWNER' ORDER BY m.id LIMIT 1`,
  );
  expect(shopId).not.toBe('');
  saved = sql(`SELECT id, "ratePhp", "turnaroundHours", active FROM "ShopService" WHERE "shopId" = '${shopId}'`)
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [id, rate, hours, active] = l.split('|');
      return { id, rate, hours, active };
    });
});

test.afterAll(() => {
  if (!shopId) return;
  for (const r of saved) {
    sql(
      `UPDATE "ShopService" SET "ratePhp" = ${Number(r.rate)}, "turnaroundHours" = ${Number(r.hours)}, ` +
        `active = ${r.active === 't'} WHERE id = '${r.id}'`,
    );
  }
  const keep = saved.map((r) => `'${r.id}'`).join(',') || `''`;
  sql(`DELETE FROM "ShopService" WHERE "shopId" = '${shopId}' AND id NOT IN (${keep})`);
});

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe('services and rates (phone)', () => {
  test.use({ viewport: PHONE });

  test('the owner changes a rate, it validates, saves and survives a reload', async ({ page }) => {
    await page.goto('/services');
    await expect(page.getByRole('heading', { level: 1, name: 'Services & rates' })).toBeVisible();
    const wdf = page.getByTestId('svc-WDF');
    await expect(page.getByTestId('svc-toggle-WDF')).toBeChecked();
    const rate = wdf.getByLabel('Rate per kg');
    await expect(rate).toHaveValue('25.00');
    await expect(page.getByText('Customers see these rates when they book.', { exact: false })).toBeVisible();

    // Nothing to save until something changes.
    await expect(page.getByTestId('services-save')).toHaveCount(0);

    await rate.fill('100000');
    await page.getByTestId('services-save').click();
    await expect(wdf.getByText('Enter a rate up to ₱99,999.00, with at most 2 decimals.')).toBeVisible();

    await rate.fill('27.50');
    await expect(page.getByTestId('price-example')).toContainText('₱165.00');
    await noHorizontalScroll(page);
    await page.getByTestId('services-save').click();
    await expect(page.getByText('Rates saved.')).toBeVisible();
    await expect(page.getByTestId('services-save')).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('svc-WDF').getByLabel('Rate per kg')).toHaveValue('27.50');
  });
});
