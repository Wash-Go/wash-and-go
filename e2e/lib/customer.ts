import { expect, type Page } from '@playwright/test';
import { CUSTOMER_URL } from '../playwright.config';

// Seeded Firebase test account (created earlier in the project).
export const TEST_EMAIL = 'tester@washandgo.app';
export const TEST_PASSWORD = 'washgo123456';

/*
 * Logs the customer app in with the real Firebase email/password account and
 * lands on the dashboard. Expo-web renders React Native TextInputs as <input>s
 * (matched by placeholder) and the PrimaryButton's label as clickable text.
 */
export async function customerLogin(page: Page): Promise<void> {
  await page.goto(CUSTOMER_URL);
  // The auth gate redirects an unauthenticated session to the login screen.
  const email = page.getByPlaceholder('Email');
  await expect(email).toBeVisible({ timeout: 60_000 });
  await email.fill(TEST_EMAIL);
  await page.getByPlaceholder('Password (min 6)').fill(TEST_PASSWORD);
  await page.getByText('Sign in', { exact: true }).click();

  // Dashboard hero CTA proves we're authenticated + past /auth/session.
  await expect(page.getByRole('button', { name: /Book a wash/ })).toBeVisible({
    timeout: 30_000,
  });
}
