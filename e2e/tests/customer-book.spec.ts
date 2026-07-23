import { expect, test } from '@playwright/test';
import { customerLogin } from '../lib/customer';

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

  test('logs in, books a load, geocodes a pickup, reaches a priced checkout', async ({
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
    await expect(cont).toBeEnabled({ timeout: 20_000 });
    await cont.click();

    // Checkout resolved the nearest shop + a peso total.
    await expect(page.getByText('Confirm booking')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/₱\s?\d/).first()).toBeVisible();
    // The resolved-shop card shows the "Closest" badge.
    await expect(page.getByText('Closest')).toBeVisible();
  });
});
