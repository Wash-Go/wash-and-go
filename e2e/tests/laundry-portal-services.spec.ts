import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
import { API_URL } from '../playwright.config';
import { actAs, createDevUser, deleteDevUser, devUid } from '../fixtures/dev-users';

/*
 * Browser smoke: the laundry-portal Services & rates page (plan A4
 * "Services"), as the dev-shop-owner stub (owner of the seeded Tetuan Laundry
 * Hub) against a production build and the local API. The owner edits the
 * wash, dry & fold rate and it survives a reload.
 *
 * beforeAll snapshots the shop's ShopService rows with psql (E2E_DATABASE_URL,
 * default the design DB the local API runs on); afterAll puts every saved
 * rate, turnaround and on/off back and deletes any row the spec created.
 *
 * The staff test follows laundry-portal-invite.spec.ts: a fresh user with an
 * email on file (dev route), invited by the seeded owner, accepts through the
 * API and opens /services read-only. Cleanup removes the membership, deletes
 * the user with the dev route and the accepted invite row with psql, and
 * checks the seeded shop's member list is back to what it was.
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

async function call(uid: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'x-dev-uid': uid, ...(body != null ? { 'content-type': 'application/json' } : {}) },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

type Member = { id: string; userId: string; role: string; email: string | null };

test.describe('services and rates as staff (phone)', () => {
  // page.route rewrites x-dev-uid; the service worker's fetches would skip it.
  test.use({ viewport: PHONE, serviceWorkers: 'block' });

  const STAFF_UID = devUid('e2e-services-staff');
  const EMAIL = `${STAFF_UID}@example.com`;
  let inviteId = '';
  let membersBefore: string[] = [];

  test.beforeAll(async () => {
    membersBefore = ((await call('dev-shop-owner', 'GET', '/shop/members')) as Member[]).map((m) => m.id).sort();
    const me = await createDevUser({ uid: STAFF_UID, displayName: 'Sam Staff', email: EMAIL, roles: ['CUSTOMER'] });
    expect(me.inviteEmailOnFile).toBe(true);
    inviteId = ((await call('dev-shop-owner', 'POST', '/shop/invites', { email: EMAIL })) as { id: string }).id;
    const joined = (await call(STAFF_UID, 'POST', `/shop/invites/${inviteId}/accept`)) as { role: string };
    expect(joined.role).toBe('STAFF');
  });

  test.afterAll(async () => {
    const team = (await call('dev-shop-owner', 'GET', '/shop/members')) as Member[];
    for (const m of team.filter((x) => x.email === EMAIL)) await call('dev-shop-owner', 'DELETE', `/shop/members/${m.id}`);
    await deleteDevUser(STAFF_UID);
    if (inviteId) sql(`DELETE FROM "ShopInvite" WHERE id = '${inviteId.replace(/'/g, "''")}'`);
    const after = ((await call('dev-shop-owner', 'GET', '/shop/members')) as Member[]).map((m) => m.id).sort();
    expect(after).toEqual(membersBefore);
  });

  test('staff see the live rates read-only with "Ask the owner to change rates"', async ({ page }) => {
    await actAs(page, STAFF_UID);
    await page.goto('/services');
    await expect(page.getByRole('heading', { level: 1, name: 'Services & rates' })).toBeVisible();
    const page_ = page.getByTestId('services-page');
    await expect(page_.getByTestId('service-WDF')).toContainText('Wash, Dry & Fold');
    // The owner test may have changed the rate (restored in afterAll), so match the shape.
    await expect(page_.getByTestId('service-WDF')).toContainText(/₱[\d,]+\.\d{2} \/ kg · \d+ h/);
    await expect(page_.getByTestId('service-WDF')).toContainText('Offered');
    await expect(page.getByText('Ask the owner to change rates.')).toBeVisible();
    // No editing: no save, no rate or turnaround inputs, no toggles.
    await expect(page.getByTestId('services-save')).toHaveCount(0);
    await expect(page_.getByRole('textbox')).toHaveCount(0);
    await expect(page_.getByRole('spinbutton')).toHaveCount(0);
    await expect(page_.getByRole('checkbox')).toHaveCount(0);
    await noHorizontalScroll(page);
  });
});
