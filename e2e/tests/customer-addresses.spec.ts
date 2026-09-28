import { expect, test } from '@playwright/test';
import { CUSTOMER_URL } from '../playwright.config';
import { customerLogin } from '../lib/customer';
import { deleteSavedAddress, seedSavedAddress, type SavedAddress } from '../lib/seed';

/*
 * Browser smoke: the customer address book. A new address is pinned on a map
 * (react-native-webview), which does not render on Expo web, so the address is
 * added through the create endpoint as the signed-in test account; the smoke
 * then proves the screen lists it and that the real Remove action deletes it.
 */
test.describe('customer addresses', () => {
  test.setTimeout(120_000);

  let token: string | undefined;
  let address: SavedAddress | undefined;

  // Best-effort: if the UI remove failed, the address is still cleaned up.
  test.afterEach(async () => {
    if (token && address) await deleteSavedAddress(token, address.id).catch(() => undefined);
    token = undefined;
    address = undefined;
  });

  test('lists a saved address and removes it', async ({ page }) => {
    token = await customerLogin(page);
    const label = `E2E Addr ${Date.now()}`;
    address = await seedSavedAddress(token, {
      label,
      line: 'E2E address, Pasonanca Rd, Sta. Maria, Zamboanga City',
      lat: 6.927,
      lng: 122.08,
    });

    await page.goto(`${CUSTOMER_URL}/addresses`);

    // The add form offers the map pin; Add stays disabled until a pin is set.
    await expect(page.getByTestId('addr-open-map')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('add-address')).toBeDisabled();

    // The seeded address appears in the list.
    const row = page.getByTestId(`address-${address.id}`);
    await expect(row).toBeVisible({ timeout: 30_000 });
    await expect(row.getByText(label)).toBeVisible();

    // Remove it via its row's Remove action; it disappears.
    await page.getByTestId(`remove-${address.id}`).click();
    await expect(page.getByText('Address removed')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(label)).toHaveCount(0, { timeout: 30_000 });
    address = undefined;
  });
});
