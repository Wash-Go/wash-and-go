import { defineConfig, devices } from '@playwright/test';

/*
 * The standalone demo build (B10): the portal with NEXT_PUBLIC_DEMO=1, which
 * needs no API and no Firebase. Build it first (`pnpm --filter
 * @wash-and-go/e2e build:portal-demo`, into apps/laundry-portal/.next-e2e);
 * the webServer below serves that build on :3010 (or reuses one already
 * there). `pnpm --filter @wash-and-go/e2e smoke:portal-demo` does both, and
 * first proves a plain build carries no demo code.
 */
export const DEMO_URL = process.env.PORTAL_DEMO_URL ?? 'http://localhost:3010';

export default defineConfig({
  testDir: './tests',
  testMatch: /laundry-portal-demo\.spec\.ts/,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: { baseURL: DEMO_URL, trace: 'retain-on-failure', screenshot: 'only-on-failure', headless: true },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm --filter @wash-and-go/laundry-portal exec next start -p 3010',
    url: `${DEMO_URL}/login`,
    env: { NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? '.next-e2e' },
    reuseExistingServer: true,
    timeout: 60_000,
    cwd: '..',
  },
});
