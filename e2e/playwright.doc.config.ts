import { defineConfig, devices } from '@playwright/test';

// Lean config for standalone document PDFs (money flow, etc.) — no app servers,
// just render HTML → PDF.
export default defineConfig({
  testDir: './capture',
  testMatch: /(money|costs)\.spec\.ts/,
  workers: 1,
  reporter: [['list']],
  timeout: 120_000,
  use: { headless: true },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
