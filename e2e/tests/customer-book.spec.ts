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

    // Large (>6kg) is gated to Scheduled (Tier 1) — shows the badge and can't be
    // selected for Express.
    await expect(page.getByTestId('bucket-L')).toBeVisible();
    await expect(page.getByTestId('bucket-L-scheduled')).toBeVisible();

    // Pick the Medium load bucket (Express-eligible).
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

  test('books a Large load as Scheduled: pick slot → checkout shows pickup time → confirm', async ({
    page,
  }) => {
    await customerLogin(page);
    await page.getByRole('button', { name: /Book a wash/ }).click();

    // Large is now selectable and routes to Scheduled (Tier 1).
    await expect(page.getByTestId('bucket-L')).toBeVisible();
    await page.getByTestId('bucket-L').click();

    // A pickup-window picker appears; choose the first slot.
    await expect(page.getByTestId('slot-0')).toBeVisible();
    await page.getByTestId('slot-0').click();

    await page.getByPlaceholder('Pickup address (street, barangay)').fill('Tetuan, Zamboanga City');
    await page.getByText('Find this address').click();

    const cont = page.getByText('Continue', { exact: true });
    await expect(cont).toBeEnabled({ timeout: 30_000 });
    await cont.click();

    // Checkout prices the Large scheduled order (no ceiling) + shows the pickup time.
    const confirm = page.getByText('Confirm booking');
    await expect(confirm).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('scheduled-pickup')).toBeVisible();
    await expect(page.getByTestId('service-badge')).toHaveText('Scheduled');

    await confirm.click();
    await expect(page.getByText(/WG-\d{4}-\d+/)).toBeVisible({ timeout: 30_000 });
  });

  test('cancels a booked order from the order detail', async ({ page }) => {
    await customerLogin(page);
    await page.getByRole('button', { name: /Book a wash/ }).click();
    await page.getByTestId('bucket-M').click();
    await page.getByPlaceholder('Pickup address (street, barangay)').fill('Tetuan, Zamboanga City');
    await page.getByText('Find this address').click();
    const cont = page.getByText('Continue', { exact: true });
    await expect(cont).toBeEnabled({ timeout: 30_000 });
    await cont.click();
    const confirm = page.getByText('Confirm booking');
    await expect(confirm).toBeVisible({ timeout: 30_000 });
    await confirm.click();
    await expect(page.getByText(/WG-\d{4}-\d+/)).toBeVisible({ timeout: 30_000 });

    // Cancel from the order detail (two-step confirm).
    await page.getByTestId('cancel-order').click();
    await page.getByText('Yes, cancel booking').click();
    await expect(page.getByText('Order cancelled')).toBeVisible({ timeout: 30_000 });
  });
});
