import { defineConfig, devices } from '@playwright/test';

/*
 * Browser smoke tests for the web surfaces (admin-dashboard, laundry-portal).
 * These prove the buttons + flows actually work end-to-end in a real browser,
 * not just that the logic units pass. They seed data through the API (x-dev-uid
 * stubs), then drive the UI.
 *
 * Prereqs the runner must have up: API on :4000 + Docker Postgres. The portal
 * dev server is auto-started by the webServer block below.
 */
const PORTAL_URL = process.env.PORTAL_URL ?? 'http://localhost:3002';
export const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export default defineConfig({
  testDir: './tests',
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
  webServer: {
    command: 'pnpm --filter @wash-and-go/laundry-portal dev',
    url: PORTAL_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    cwd: '..',
  },
});
