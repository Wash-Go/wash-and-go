import type { Page } from '@playwright/test';
import { API_URL } from '../playwright.config';

/*
 * Test users through the API's dev route (B6a, only mounted with
 * AUTH_DEV_BYPASS=1 and NODE_ENV development/test):
 *   POST   /dev/users        upsert a user by firebase uid → MeResponse
 *   DELETE /dev/users/:uid   delete the user and everything they own, in one
 *                            transaction (solely owned shops with their
 *                            orders, services, members and invites; the
 *                            user's notifications, memberships, invites sent)
 * The auth guard resolves the caller first, so both calls are made as an
 * existing seeded user (the design DB's dev admin). Seeded uids cannot be
 * deleted. No psql needed for user-owned rows.
 */
export const FIXTURE_CALLER = 'dev-admin';

export type DevUserBody = {
  uid: string;
  displayName?: string;
  email?: string;
  roles?: ('CUSTOMER' | 'RIDER' | 'SHOP_OWNER' | 'SHOP_STAFF' | 'ADMIN')[];
};

export type DevUser = {
  id: string;
  displayName: string;
  roles: string[];
  emailVerified: boolean;
  inviteEmailOnFile: boolean;
};

async function devCall(method: string, path: string, body?: unknown): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method,
    headers: { 'x-dev-uid': FIXTURE_CALLER, ...(body != null ? { 'content-type': 'application/json' } : {}) },
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

export async function createDevUser(body: DevUserBody): Promise<DevUser> {
  const res = await devCall('POST', '/dev/users', body);
  if (res.status !== 201) throw new Error(`POST /dev/users → ${res.status}: ${await res.text()}`);
  return (await res.json()) as DevUser;
}

// Idempotent: an unknown uid is a no-op (204).
export async function deleteDevUser(uid: string): Promise<void> {
  const res = await devCall('DELETE', `/dev/users/${encodeURIComponent(uid)}`);
  if (res.status !== 204) throw new Error(`DELETE /dev/users/${uid} → ${res.status}: ${await res.text()}`);
}

// A unique, route-safe uid for one spec run.
export function devUid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// Act as another user in the browser: rewrite x-dev-uid on API calls. The
// service worker's own fetches skip page.route, so specs using this block
// service workers.
export async function actAs(page: Page, uid: string): Promise<void> {
  await page.route(`${API_URL}/**`, (route) =>
    route.continue({ headers: { ...route.request().headers(), 'x-dev-uid': uid } }),
  );
}
