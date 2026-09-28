import { expect, type Page } from '@playwright/test';
import { CUSTOMER_URL } from '../playwright.config';

// Seeded Firebase test account (created earlier in the project).
export const TEST_EMAIL = 'tester@washandgo.app';
export const TEST_PASSWORD = 'washgo123456';
// Mobile number the booking gate saves on the test account (U0 T4). Outside
// the seed range (+63917000000x) so it never collides with a seeded user.
export const TEST_PHONE = '0999 000 0101';

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
    timeout: 45_000,
  });
}

/*
 * Taps "Confirm booking" on checkout and waits for the order. U0 T4: an account
 * with no mobile number yet (the tester is an email sign-up) is first sent to
 * "Add your mobile number"; save TEST_PHONE there (once — it sticks), come back
 * to checkout and confirm again.
 */
export async function confirmBooking(page: Page): Promise<void> {
  const confirm = page.getByRole('button', { name: 'Confirm booking' });
  const gate = page.getByText('Add your mobile number');
  const orderCode = page.getByText(/WG-\d{4}-\d+/);
  await confirm.click();
  await expect(gate.or(orderCode)).toBeVisible({ timeout: 30_000 });
  if (await gate.isVisible()) {
    const name = page.getByTestId('details-name');
    if (!(await name.inputValue()).trim()) await name.fill('E2E Tester');
    await page.getByTestId('details-phone').fill(TEST_PHONE);
    await page.getByText('Save and continue').click();
    await expect(confirm).toBeVisible({ timeout: 30_000 });
    await confirm.click();
  }
  await expect(orderCode).toBeVisible({ timeout: 30_000 });
}
