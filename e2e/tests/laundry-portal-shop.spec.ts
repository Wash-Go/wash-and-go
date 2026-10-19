import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';

/*
 * Browser smoke: the laundry-portal Shop and Staff screens (plan B4), as the
 * dev-shop-owner stub (owner of the seeded Tetuan Laundry Hub) against a
 * production build and the local API.
 *
 * The spec edits the seeded shop, so beforeAll snapshots the columns it
 * touches (contact phone, payout account) with psql (E2E_DATABASE_URL, default
 * the design DB the local API runs on) and afterAll writes them back and
 * deletes the invite rows it created. Invite acceptance needs a real verified
 * email, which the dev stub cannot have; it is covered by jest
 * (lib/invites.spec.ts) and the api-client spec instead.
 */
const PHONE = { width: 390, height: 844 };
const DB = process.env.E2E_DATABASE_URL ?? 'postgresql://ban@localhost:5432/wash_and_go_design';
const STAMP = Date.now();
const INVITE_EMAIL = `e2e-invite-${STAMP}@example.com`;
const GCASH = '0917 555 0199';

function sql(q: string): string {
  return execFileSync('psql', [DB, '-v', 'ON_ERROR_STOP=1', '-Atc', q]).toString().trim();
}
const lit = (v: string) => (v === '' ? 'NULL' : `'${v.replace(/'/g, "''")}'`);

const COLS = ['contactPhone', 'payoutMethod', 'payoutAccountName', 'payoutAccountNumber', 'payoutBankName', 'payoutUpdatedAt'];
let shopId = '';
let saved: string[] = [];

test.beforeAll(() => {
  shopId = sql(
    `SELECT s.id FROM "Shop" s JOIN "ShopMember" m ON m."shopId" = s.id JOIN "User" u ON u.id = m."userId" ` +
      `WHERE u."firebaseUid" = 'dev-shop-owner' AND m.role = 'OWNER' ORDER BY m.id LIMIT 1`,
  );
  expect(shopId).not.toBe('');
  saved = sql(`SELECT ${COLS.map((c) => `coalesce("${c}"::text, '')`).join(` || '|' || `)} FROM "Shop" WHERE id = '${shopId}'`).split('|');
});

test.afterAll(() => {
  if (!shopId) return;
  const sets = COLS.map((c, i) => {
    const v = saved[i] ?? '';
    const cast = c === 'payoutMethod' ? '::"PayoutMethod"' : c === 'payoutUpdatedAt' ? '::timestamp' : '';
    return `"${c}" = ${v === '' ? 'NULL' : `${lit(v)}${cast}`}`;
  });
  sql(`UPDATE "Shop" SET ${sets.join(', ')} WHERE id = '${shopId}'`);
  sql(`DELETE FROM "ShopInvite" WHERE "shopId" = '${shopId}' AND email LIKE 'e2e-invite-%@example.com'`);
});

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe.configure({ mode: 'serial' });

test.describe('shop and staff (phone)', () => {
  test.use({ viewport: PHONE });

  test('the shop page shows the seeded shop and saves the contact phone', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.getByRole('heading', { name: 'Shop', exact: true })).toBeVisible();
    await expect(page.getByTestId('shop-status')).toContainText('Verified partner');
    const profile = page.getByTestId('shop-profile');
    await expect(profile.getByLabel('Laundry name')).toHaveValue('Tetuan Laundry Hub');

    // No Save until something changes; one Save per card.
    await expect(profile.getByRole('button', { name: 'Save profile' })).toHaveCount(0);
    const phone = profile.getByLabel('Contact phone');
    expect(await phone.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
    await phone.fill('12345');
    await profile.getByRole('button', { name: 'Save profile' }).click();
    await expect(profile.getByText('Enter a PH mobile number, e.g. 0917 123 4567.')).toBeVisible();
    await phone.fill('0917 555 0188');
    await profile.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByText('Profile saved.')).toBeVisible();
    await expect(profile.getByRole('button', { name: 'Save profile' })).toHaveCount(0);
    await noHorizontalScroll(page);

    await page.reload();
    await expect(page.getByTestId('shop-profile').getByLabel('Contact phone')).toHaveValue('0917 555 0188');
  });

  test('the payout account is set through a confirm and shown masked only', async ({ page }) => {
    await page.goto('/shop');
    const card = page.getByTestId('payout-card');
    await expect(card).toContainText('No payout account yet.');
    await card.getByRole('button', { name: 'Add payout account' }).click();

    const sheet = page.getByRole('dialog', { name: 'Add payout account' });
    await expect(sheet.getByRole('radio', { name: 'GCash' })).toHaveAttribute('aria-checked', 'true');
    await sheet.getByRole('button', { name: 'Save payout account' }).click();
    await expect(sheet.getByText('Enter the account name.')).toBeVisible();
    await sheet.getByLabel('Account name').fill('R. Fernandez');
    await sheet.getByLabel('GCash number').fill(GCASH);
    await sheet.getByRole('button', { name: 'Save payout account' }).click();

    const confirm = page.getByRole('alertdialog', { name: 'Save payout account?' });
    await expect(confirm).toContainText('Payouts will go to the new account from the next batch.');
    await confirm.getByRole('button', { name: 'Yes, save it' }).click();

    await expect(card.getByTestId('payout-line')).toHaveText('GCash · •••• 0199');
    await expect(card).toContainText('R. Fernandez');
    // The full number never reaches the page.
    const html = await page.content();
    expect(html).not.toContain('5550199');
    expect(html).not.toContain('555 0199');

    await page.reload();
    await expect(page.getByTestId('payout-line')).toHaveText('GCash · •••• 0199');

    // Remove, behind a confirm.
    await page.getByTestId('payout-card').getByRole('button', { name: 'Remove' }).click();
    await page.getByRole('alertdialog', { name: 'Remove payout account?' }).getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByTestId('payout-card')).toContainText('No payout account yet.');
  });

  test('staff: invite by email, see it pending, revoke it', async ({ page }) => {
    await page.goto('/staff');
    await expect(page.getByRole('heading', { name: 'Staff', exact: true })).toBeVisible();
    await expect(page.getByTestId('members')).toContainText('Owner');

    await page.getByRole('button', { name: 'Invite by email' }).click();
    const sheet = page.getByRole('dialog', { name: 'Invite by email' });
    const email = sheet.getByLabel('Their email');
    await expect(email).toHaveAttribute('type', 'email');
    expect(await email.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
    await email.fill('ana@');
    await sheet.getByRole('button', { name: 'Send invite' }).click();
    await expect(sheet.getByText('Enter a full email address, like ana@gmail.com.')).toBeVisible();
    await email.fill(INVITE_EMAIL);
    await sheet.getByRole('button', { name: 'Send invite' }).click();
    await expect(sheet).toHaveCount(0);

    const row = page.getByTestId('invite-row').filter({ hasText: INVITE_EMAIL });
    await expect(row).toBeVisible();

    // A second invite to the same email is refused with human copy.
    await page.getByRole('button', { name: 'Invite by email' }).click();
    await page.getByRole('dialog', { name: 'Invite by email' }).getByLabel('Their email').fill(INVITE_EMAIL);
    await page.getByRole('dialog', { name: 'Invite by email' }).getByRole('button', { name: 'Send invite' }).click();
    await expect(page.getByText('Already a member or already invited.')).toBeVisible();
    await page.getByRole('dialog', { name: 'Invite by email' }).getByRole('button', { name: 'Close' }).click();
    await noHorizontalScroll(page);

    await page.reload();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Revoke' }).click();
    await page.getByRole('alertdialog', { name: 'Revoke this invite?' }).getByRole('button', { name: 'Revoke' }).click();
    await expect(row).toHaveCount(0);
  });
});
