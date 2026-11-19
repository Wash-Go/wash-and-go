import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { API_URL } from '../playwright.config';
import { actAs, createDevUser, deleteDevUser, devUid } from '../fixtures/dev-users';

/*
 * Browser smoke: accepting a staff invite (plan A3 flow 6, B4b gap). A fresh
 * customer with an email on file is created through the dev route, the
 * seeded owner (dev-shop-owner, Tetuan Laundry Hub) invites that email, and
 * the invitee opens the portal: the not-a-shop screen offers "… invited you
 * to join Tetuan Laundry Hub", Accept joins the shop and the gate lands on
 * Orders. afterAll deletes the invitee with the dev route (their membership
 * goes with them). The invite row itself belongs to the seeded owner, whom the
 * cascade never touches, and an accepted invite cannot be revoked through the
 * API, so that one row is deleted with psql (E2E_DATABASE_URL, default the
 * design DB): the only row the dev-route cascade does not cover.
 */
const DB = process.env.E2E_DATABASE_URL ?? 'postgresql://ban@localhost:5432/wash_and_go_design';
const UID = devUid('e2e-invitee');
const EMAIL = `${UID}@example.com`;
let inviteId = '';

async function asOwner(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'x-dev-uid': 'dev-shop-owner', ...(body != null ? { 'content-type': 'application/json' } : {}) },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

test.beforeAll(async () => {
  const me = await createDevUser({ uid: UID, displayName: 'Ina Invitee', email: EMAIL, roles: ['CUSTOMER'] });
  expect(me.inviteEmailOnFile).toBe(true);
  const invite = (await asOwner('POST', '/shop/invites', { email: EMAIL })) as { id: string };
  inviteId = invite.id;
});

test.afterAll(async () => {
  await deleteDevUser(UID);
  if (inviteId) {
    const id = inviteId.replace(/'/g, "''");
    execFileSync('psql', [DB, '-v', 'ON_ERROR_STOP=1', '-Atc', `DELETE FROM "ShopInvite" WHERE id = '${id}'`]);
  }
});

test.describe('invite acceptance (phone)', () => {
  // page.route rewrites x-dev-uid; the service worker's fetches would skip it.
  test.use({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });

  test('an invited customer accepts and lands on Orders', async ({ page }) => {
    await actAs(page, UID);
    await page.goto('/');
    const card = page.getByTestId('invite-card');
    await expect(card).toContainText('invited you to join Tetuan Laundry Hub');
    await expect(page.getByRole('button', { name: 'Register your laundry' })).toBeVisible();
    await card.getByRole('button', { name: 'Accept' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Orders' })).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/$/);
    // Staff have no owner onboarding view; the shell reads the name from /shop/me.
    await expect(page.getByTestId('shell-header')).toContainText('Tetuan Laundry Hub');
    const team = (await asOwner('GET', '/shop/members')) as { email: string | null; name: string; role: string }[];
    expect(team.some((m) => m.email === EMAIL && m.role === 'STAFF')).toBe(true);
  });
});
