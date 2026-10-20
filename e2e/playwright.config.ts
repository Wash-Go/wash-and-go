import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

/*
 * Browser smoke tests for the web surfaces (admin-dashboard, laundry-portal).
 * These prove the buttons + flows actually work end-to-end in a real browser,
 * not just that the logic units pass. They seed data through the API (x-dev-uid
 * stubs), then drive the UI.
 *
 * Prereqs the runner must have up: API on :4000 (AUTH_DEV_BYPASS=1) + Postgres.
 * The four web apps are auto-started by the webServer block below (or reused if
 * already running), each pointed at API_URL — an app's own .env (e.g. a LAN IP
 * for phone testing) must not decide which API a smoke talks to.
 */
const PORTAL_URL = process.env.PORTAL_URL ?? 'http://localhost:3002';
export const ADMIN_URL = process.env.ADMIN_URL ?? 'http://localhost:3001';
export const CUSTOMER_URL = process.env.CUSTOMER_URL ?? 'http://localhost:3000';
export const RIDER_URL = process.env.RIDER_URL ?? 'http://localhost:3003';
export const API_URL = process.env.API_URL ?? 'http://localhost:4000';

const WEB_SERVERS: PlaywrightTestConfig['webServer'] & unknown[] = [
    {
      command: 'pnpm --filter @wash-and-go/laundry-portal dev',
      url: PORTAL_URL,
      // NEXT_PUBLIC_E2E=1 enables test-only hooks (the Done ?donePage= size).
      // A production build for the smokes: `pnpm --filter @wash-and-go/e2e build:portal-e2e`.
      env: { NEXT_PUBLIC_API_URL: API_URL, NEXT_PUBLIC_E2E: '1' },
      reuseExistingServer: true,
      timeout: 120_000,
      cwd: '..',
    },
    {
      command: 'pnpm --filter @wash-and-go/admin-dashboard dev',
      url: ADMIN_URL,
      env: { NEXT_PUBLIC_API_URL: API_URL },
      reuseExistingServer: true,
      timeout: 120_000,
      cwd: '..',
    },
    {
      // Expo web — first bundle is slow, so a generous timeout.
      command: 'pnpm --filter @wash-and-go/customer-mobile web',
      url: CUSTOMER_URL,
      env: { EXPO_PUBLIC_API_URL: API_URL },
      reuseExistingServer: true,
      timeout: 240_000,
      cwd: '..',
    },
    {
      command: 'pnpm --filter @wash-and-go/rider-mobile exec expo start --web --port 3003',
      url: RIDER_URL,
      env: { EXPO_PUBLIC_API_URL: API_URL },
      reuseExistingServer: true,
      timeout: 240_000,
      cwd: '..',
    },
];

export default defineConfig({
  testDir: './tests',
  // The standalone demo build has its own config (playwright.demo.config.ts):
  // it needs a NEXT_PUBLIC_DEMO=1 build on :3010, not the API-backed portal.
  testIgnore: /laundry-portal-demo\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: PORTAL_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // E2E_ONLY=portal (the portal smoke script) starts or reuses only the
  // portal; the other apps' dev servers take minutes and are not needed.
  webServer: process.env.E2E_ONLY === 'portal' ? WEB_SERVERS.slice(0, 1) : WEB_SERVERS,
});
