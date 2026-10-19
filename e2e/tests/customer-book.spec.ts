import { expect, test, type Page } from '@playwright/test';
import { confirmBooking, customerLogin } from '../lib/customer';
import {
  cancelOpenOrdersOf,
  deleteSavedAddress,
  seedSavedAddress,
  type SavedAddress,
} from '../lib/seed';

/*
 * Browser smoke for the customer booking path — the whole reason the app exists.
 * Real Firebase login → dashboard → Book → pick a load → pick a saved pickup
 * address → Continue → Checkout resolves the nearest shop and prices it →
 * Confirm → the order exists. Proves the buttons + the book→quote→order flow
 * work in a real browser, end to end.
 *
 * The pickup comes from the address book, not the map: the map picker is a
 * react-native-webview, which does not render on Expo web. So each test seeds a
 * saved address (as the signed-in test account) and removes it afterwards.
 */

// Veterans Ave, Tetuan — inside the coverage zone, near both seeded shops.
const PICKUP = {
  line: 'E2E pickup, Veterans Ave, Tetuan, Zamboanga City',
  lat: 6.9111,
  lng: 122.0794,
};

// Picks the seeded address from Book's "Saved addresses" list (matched by its
// unique label) and goes on to checkout.
async function pickupFromSavedAndContinue(page: Page, address: SavedAddress) {
  await page.getByText(address.label!, { exact: true }).click();
  const cont = page.getByText('Continue', { exact: true });
  await expect(cont).toBeEnabled({ timeout: 30_000 });
  await cont.click();
  await expect(page.getByRole('button', { name: 'Confirm booking' })).toBeVisible({
    timeout: 30_000,
  });
}

test.describe('customer booking', () => {
  // Expo web + Firebase + quote round-trips — give it room.
  test.setTimeout(120_000);

  let token: string | undefined;
  let address: SavedAddress | undefined;

  test.beforeEach(async ({ page }) => {
    token = await customerLogin(page);
    // Seeded before Book opens: Book loads the address book on mount.
    address = await seedSavedAddress(token, {
      label: `E2E Pickup ${Date.now()}`,
      ...PICKUP,
    });
  });

  // Confirming creates a real order under the test account: cancel it (only
  // this account's open orders), then remove the seeded address.
  test.afterEach(async () => {
    if (!token) return;
    await cancelOpenOrdersOf(token).catch(() => undefined);
    if (address) await deleteSavedAddress(token, address.id).catch(() => undefined);
    token = undefined;
    address = undefined;
  });

  test('books an Express load end to end: login → saved pickup → checkout → confirm → order', async ({
    page,
  }) => {
    // Dashboard → Book (the CTA button, not the empty-state prose).
    await page.getByRole('button', { name: /Book a wash/ }).click();

    // Large (over the Express ceiling) is gated to Scheduled (Tier 1) — shows
    // the badge instead of the Express radio.
    await expect(page.getByTestId('bucket-L')).toBeVisible();
    await expect(page.getByTestId('bucket-L-scheduled')).toBeVisible();

    // Pick the Medium load bucket (Express-eligible).
    await expect(page.getByTestId('bucket-M')).toBeVisible();
    await page.getByTestId('bucket-M').click();

    await pickupFromSavedAndContinue(page, address!);

    // Checkout resolved the nearest shop + a peso total, as Express.
    await expect(page.getByText(/₱\s?\d/).first()).toBeVisible();
    await expect(page.getByText('Closest')).toBeVisible();
    await expect(page.getByTestId('service-badge')).toHaveText('Express');

    // Confirm → creates the order and navigates to its detail page (adding the
    // test account's mobile number first if it has none yet).
    await confirmBooking(page);
    // Order detail shows the newly-minted order code + its total.
    await expect(page.getByText('Total')).toBeVisible();
  });

  test('books a Large load as Scheduled: pick slot → checkout shows pickup time → confirm', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Book a wash/ }).click();

    // Large is selectable and routes to Scheduled (Tier 1).
    await expect(page.getByTestId('bucket-L')).toBeVisible();
    await page.getByTestId('bucket-L').click();

    // A pickup-window picker appears; choose the first slot.
    await expect(page.getByTestId('slot-0')).toBeVisible();
    await page.getByTestId('slot-0').click();

    await pickupFromSavedAndContinue(page, address!);

    // Checkout prices the Large scheduled order (no ceiling) + shows the pickup time.
    await expect(page.getByTestId('scheduled-pickup')).toBeVisible();
    await expect(page.getByTestId('service-badge')).toHaveText('Scheduled');

    await confirmBooking(page);
  });

  test('cancels a booked order from the order detail', async ({ page }) => {
    await page.getByRole('button', { name: /Book a wash/ }).click();
    await page.getByTestId('bucket-M').click();
    await pickupFromSavedAndContinue(page, address!);
    await confirmBooking(page);

    // Cancel from the order detail (two-step confirm).
    await page.getByTestId('cancel-order').click();
    await page.getByText('Yes, cancel booking').click();
    await expect(page.getByText('Order cancelled')).toBeVisible({ timeout: 30_000 });
  });
});
