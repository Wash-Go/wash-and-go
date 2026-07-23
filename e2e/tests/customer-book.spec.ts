import { expect, test } from '@playwright/test';
import { customerLogin } from '../lib/customer';
import { cancelAllOpenOrders } from '../lib/seed';

/*
 * Browser smoke for the customer booking path — the whole reason the app exists.
 * Real Firebase login → dashboard → Book → pick a load → geocode a typed address
 * (the TomTom-backed "Find this address") → Continue → Checkout resolves the
 * nearest shop and prices it. Proves the buttons + the book→quote flow work in a
 * real browser, end to end.
 */
test.describe('customer booking', () => {
  // Expo web + Firebase + geocode round-trips — give it room.
  test.setTimeout(120_000);

  // Confirming creates a real order under the test Firebase user; cancel it.
  test.afterEach(async () => {
    await cancelAllOpenOrders().catch(() => undefined);
  });

  test('books a load end to end: login → geocode → checkout → confirm → order', async ({
    page,
  }) => {
    await customerLogin(page);

    // Dashboard → Book (the CTA button, not the empty-state prose).
    await page.getByRole('button', { name: /Book a wash/ }).click();

    // Pick the Medium load bucket.
    await expect(page.getByTestId('bucket-M')).toBeVisible();
    await page.getByTestId('bucket-M').click();

    // Type a pickup and geocode it (no GPS needed in headless).
    await page.getByPlaceholder('Pickup address (street, barangay)').fill('Tetuan, Zamboanga City');
    await page.getByText('Find this address').click();

    // Geocode succeeded → Continue becomes enabled; go to checkout.
    const cont = page.getByText('Continue', { exact: true });
    await expect(cont).toBeEnabled({ timeout: 30_000 });
    await cont.click();

    // Checkout resolved the nearest shop + a peso total.
    const confirm = page.getByText('Confirm booking');
    await expect(confirm).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/₱\s?\d/).first()).toBeVisible();
    // The resolved-shop card shows the "Closest" badge.
    await expect(page.getByText('Closest')).toBeVisible();

    // Confirm → creates the order and navigates to its detail page.
    await confirm.click();
    // Order detail shows the newly-minted order code + its total.
    await expect(page.getByText(/WG-\d{4}-\d+/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Total')).toBeVisible();
  });
});
