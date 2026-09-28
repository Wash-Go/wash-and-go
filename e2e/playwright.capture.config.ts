import { defineConfig, devices } from '@playwright/test';

// Dedicated config for the feature-PDF capture run. Isolated from the normal
// suite (its own testDir) but reuses the same webServer orchestration so all
// four apps + the API are up while it screenshots them.
const PORTAL_URL = 'http://localhost:3002';
const ADMIN_URL = 'http://localhost:3001';
const CUSTOMER_URL = 'http://localhost:3000';
const RIDER_URL = 'http://localhost:3003';

export default defineConfig({
  testDir: './capture',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  timeout: 300_000,
  use: { headless: true, viewport: { width: 1280, height: 900 } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'pnpm --filter @wash-and-go/laundry-portal dev', url: PORTAL_URL, reuseExistingServer: true, timeout: 120_000, cwd: '..' },
    { command: 'pnpm --filter @wash-and-go/admin-dashboard dev', url: ADMIN_URL, reuseExistingServer: true, timeout: 120_000, cwd: '..' },
    { command: 'pnpm --filter @wash-and-go/customer-mobile web', url: CUSTOMER_URL, reuseExistingServer: true, timeout: 240_000, cwd: '..' },
    { command: 'pnpm --filter @wash-and-go/rider-mobile exec expo start --web --port 3003', url: RIDER_URL, reuseExistingServer: true, timeout: 240_000, cwd: '..' },
  ],
});
