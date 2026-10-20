import { loadApiEnv } from './env';
import { demoConfig, orderIdempotencyKey } from '../../src/demo/demo-config';
import {
  authHeaders,
  type DriverAuth,
  driverUsesFirebase,
  findOrderByCode,
  parseDriverArgs,
  remainingDriverSteps,
  signInWithPassword,
} from '../../src/demo/demo-driver';

/*
 * pnpm --filter @wash-and-go/api demo:order [--run <id>] [--step-seconds 20] [--no-wait] [--rider-only <code>]
 *
 * Live-order driver over HTTP: the demo customer books an Express order to the
 * demo shop, then the demo admin assigns the demo rider and the rider marks it
 * picked up and at the shop, one step every --step-seconds. It stops at
 * AT_SHOP for the CEO to weigh in the portal. Auth: Firebase email/password
 * sign-in only with DEMO_FIREBASE=1 + FIREBASE_WEB_API_KEY + DEMO_PASSWORD
 * (tokens are never printed); otherwise the x-dev-uid stub (AUTH_DEV_BYPASS=1
 * APIs only).
 */
loadApiEnv();
const env = process.env;
const API = (env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const cfg = demoConfig(env);

type Json = Record<string, unknown>;

function stamp(): string {
  return new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila', hour12: false });
}

async function http(
  method: string,
  path: string,
  auth: DriverAuth,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...authHeaders(auth),
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`${method} ${path} → ${res.status} ${text}`);
    process.exit(1);
  }
  return text ? (JSON.parse(text) as unknown) : null;
}

async function signIn(email: string): Promise<DriverAuth> {
  try {
    const idToken = await signInWithPassword(
      fetch,
      env.FIREBASE_WEB_API_KEY!,
      email,
      env.DEMO_PASSWORD!,
    );
    // Create the API user row on first use, exactly as the apps do.
    await http('POST', '/auth/session', { kind: 'token', idToken }, { idToken });
    return { kind: 'token', idToken };
  } catch (e) {
    console.error(`Firebase sign-in failed: ${(e as Error).message}`);
    process.exit(1);
  }
}

async function main() {
  const args = parseDriverArgs(process.argv.slice(2), () => `run-${Date.now()}`);
  // Same opt-in as the seed: DEMO_FIREBASE=1 + web API key + password.
  const useFirebase = driverUsesFirebase(env);
  const [customer, rider, adminAuth] = useFirebase
    ? [
        await signIn(cfg.emails.customers[0]),
        await signIn(cfg.emails.rider),
        await signIn(cfg.emails.admin),
      ]
    : ([
        { kind: 'dev', uid: cfg.localUids.customers[0] },
        { kind: 'dev', uid: cfg.localUids.rider },
        { kind: 'dev', uid: cfg.localUids.admin },
      ] as DriverAuth[]);
  console.log(
    `API ${API} · auth ${useFirebase ? 'Firebase' : 'x-dev-uid stub'} · run ${args.runId}`,
  );

  let order: Json;
  if (args.riderOnly) {
    const found = (await http(
      'GET',
      `/orders?q=${encodeURIComponent(args.riderOnly)}`,
      adminAuth,
    )) as Json[];
    const match = findOrderByCode(found, args.riderOnly);
    if (!match) {
      console.error(`No order with code ${args.riderOnly}`);
      process.exit(1);
    }
    order = match;
    console.log(`${stamp()}  ${order.code}  resuming at ${order.status}`);
  } else {
    const shops = (await http('GET', '/shops', customer)) as Array<{
      name: string;
      services: Array<{ id: string; code: string }>;
    }>;
    const shop = shops.find((s) => s.name === cfg.shopName);
    const service = shop?.services.find((s) => s.code === 'WDF');
    if (!shop || !service) {
      console.error(
        `Demo shop "${cfg.shopName}" with a WDF service not found. Run demo:seed first.`,
      );
      process.exit(1);
    }
    order = (await http(
      'POST',
      '/orders',
      customer,
      {
        shopServiceId: service.id,
        pickupAddress: 'Demo 7 Pilar St, Tetuan, Zamboanga City',
        pickupLat: 6.9263,
        pickupLng: 122.0772,
        loadCategory: 'M',
      },
      { 'idempotency-key': orderIdempotencyKey(args.runId) },
    )) as Json;
    console.log(
      `${stamp()}  ${order.code}  ${order.status}  ` +
        (order.status === 'BOOKED'
          ? '(booked by the demo customer)'
          : '(existing order for this --run id)'),
    );
  }

  const steps = remainingDriverSteps(String(order.status));
  for (const step of steps) {
    if (args.wait && args.stepSeconds > 0)
      await new Promise((r) => setTimeout(r, args.stepSeconds * 1000));
    if (step === 'ASSIGN') {
      const riders = (await http(
        'GET',
        '/admin/users?role=RIDER&q=Demo%20Rider',
        adminAuth,
      )) as Array<{ id: string; displayName: string }>;
      const demoRider = riders.find((r) => r.displayName === 'Demo Rider');
      if (!demoRider) {
        console.error('Demo Rider not found. Run demo:seed first.');
        process.exit(1);
      }
      order = (await http('POST', `/orders/${order.id}/assign-rider`, adminAuth, {
        riderId: demoRider.id,
      })) as Json;
    } else {
      order = (await http('POST', `/orders/${order.id}/status`, rider, { status: step })) as Json;
    }
    console.log(`${stamp()}  ${order.code}  ${order.status}`);
  }
  console.log(`Done: ${order.code} is ${order.status}. Weigh it in the portal.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
