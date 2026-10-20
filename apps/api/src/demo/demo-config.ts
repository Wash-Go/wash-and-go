/*
 * Demo dataset for the CEO's investor walkthrough (B9). Pure config + marker
 * rules; no I/O. The MARKER IS THE CONTRACT: every demo row is findable by
 *   - the shop name (DEMO_SHOP_NAME, default "Wash & Go Demo Laundry"),
 *   - demo users' display names starting "Demo " (Demo Customer N, Demo Rider,
 *     Demo Staff, Demo Admin) together with their configured email / local uid,
 *   - demo orders' pickupAddress starting "Demo ".
 * Reset deletes only rows matching these markers.
 */

export const DEMO_PREFIX = 'Demo ';
export const DEMO_CUSTOMER_COUNT = 4;

type Env = Record<string, string | undefined>;

export interface DemoConfig {
  shopName: string;
  emails: {
    owner: string;
    staff: string;
    admin: string;
    rider: string;
    customers: string[];
  };
  // Deterministic firebaseUids used when no Firebase credentials are present,
  // so the x-dev-uid stub can act as each demo user locally.
  localUids: {
    owner: string;
    staff: string;
    admin: string;
    rider: string;
    customers: string[];
  };
}

const email = (v: string | undefined, fallback: string) => (v?.trim() || fallback).toLowerCase();

export function demoConfig(env: Env): DemoConfig {
  const customers = Array.from({ length: DEMO_CUSTOMER_COUNT }, (_, i) => i + 1);
  return {
    shopName: env.DEMO_SHOP_NAME?.trim() || 'Wash & Go Demo Laundry',
    emails: {
      owner: email(env.DEMO_OWNER_EMAIL, 'tatelgabrielle19@gmail.com'),
      staff: email(env.DEMO_STAFF_EMAIL, 'staff.demo@washandgo.ph'),
      admin: email(env.DEMO_ADMIN_EMAIL, 'admin.demo@washandgo.ph'),
      rider: email(env.DEMO_RIDER_EMAIL, 'rider.demo@washandgo.ph'),
      customers: customers.map((n) => `customer${n}.demo@washandgo.ph`),
    },
    localUids: {
      owner: 'demo-owner',
      staff: 'demo-staff',
      admin: 'demo-admin',
      rider: 'demo-rider',
      customers: customers.map((n) => `demo-customer-${n}`),
    },
  };
}

export function isDemoAddress(a: string | null | undefined): boolean {
  return typeof a === 'string' && a.startsWith(DEMO_PREFIX);
}

export function isDemoDisplayName(n: string | null | undefined): boolean {
  return typeof n === 'string' && n.startsWith(DEMO_PREFIX);
}

// Firebase account management is OPT-IN: only DEMO_FIREBASE=1 lets a script
// touch the Firebase project, even when apps/api/.env loads credentials.
//   'off'            — not asked: DB users with the deterministic local uids
//   'no-credentials' — asked, but neither credential source is set
//   'on'             — asked and credentials present
export function firebaseMode(env: Env): 'off' | 'no-credentials' | 'on' {
  if (env.DEMO_FIREBASE !== '1') return 'off';
  const creds = Boolean(
    env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() || env.GOOGLE_APPLICATION_CREDENTIALS?.trim(),
  );
  return creds ? 'on' : 'no-credentials';
}

export const FIREBASE_SKIPPED_MESSAGE = 'Firebase accounts skipped (set DEMO_FIREBASE=1)';

// The live-order driver books with this idempotency key, so re-running with
// the same --run id returns the same order instead of booking a second one.
export function orderIdempotencyKey(runId: string): string {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(runId)) {
    throw new Error('run id must be 1–64 of A–Z a–z 0–9 _ -');
  }
  return `demo-order-${runId}`;
}

// demo:reset refuses production unless explicitly confirmed.
export function resetAllowed(env: Env): boolean {
  return env.NODE_ENV !== 'production' || env.DEMO_RESET_CONFIRM === 'yes';
}
