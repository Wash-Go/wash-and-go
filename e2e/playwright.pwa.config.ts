import { defineConfig, devices } from '@playwright/test';

/*
 * PWA smoke config: runs tests/laundry-portal-pwa.spec.ts against a production
 * build of the laundry portal (PORTAL_PROD_URL, `next build && next start`).
 * No webServer block on purpose: the main config starts `next dev`, which
 * writes into the same .next directory and would clobber the production build
 * being served. API on :4000 (AUTH_DEV_BYPASS=1) must be up.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: /laundry-portal-pwa\.spec\.ts/,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', headless: true },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
