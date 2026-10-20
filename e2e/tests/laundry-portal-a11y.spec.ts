import { expect, test, type Page } from '@playwright/test';
import { seedAtShopOrder } from '../lib/seed';
import { deleteSeededOrders } from '../fixtures/orders';

/*
 * Keyboard and assistive-tech smoke (plan B6 a11y pass): weigh → confirm
 * with the keyboard only, the Sheet traps focus, Esc closes it and focus
 * returns to the opener, live regions exist for toasts and new orders, and
 * reduced motion turns the sheet animation off. Seeds at-shop orders and
 * deletes them afterwards (e2e/fixtures/orders.ts).
 */
const seeded: { id: string; code: string }[] = [];

test.beforeAll(async () => {
  seeded.push(await seedAtShopOrder(), await seedAtShopOrder());
});

test.afterAll(() => {
  deleteSeededOrders(seeded.map((o) => o.id));
});

test.use({ viewport: { width: 390, height: 844 } });

// Tab forward until the focused element matches, or fail after `max` presses.
async function tabTo(page: Page, matches: (el: { text: string; label: string | null; inCard: string | null }) => boolean, max = 80) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const el = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      return {
        text: (a?.textContent ?? '').trim(),
        label: a?.getAttribute('aria-label') ?? null,
        inCard: a?.closest('[data-testid^="order-"]')?.getAttribute('data-testid') ?? null,
      };
    });
    if (matches(el)) return;
  }
  throw new Error('focus never reached the target with Tab');
}

const focusedInDialog = (page: Page) =>
  page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));

test('weigh and confirm with the keyboard only', async ({ page }) => {
  const [a] = seeded;
  await page.goto('/');
  await expect(page.getByTestId(`order-${a.code}`)).toBeVisible();

  await tabTo(page, (el) => el.inCard === `order-${a.code}` && el.text === 'Weigh');
  await page.keyboard.press('Enter');
  const sheet = page.getByRole('dialog', { name: new RegExp(`Order ${a.code.slice(-4)}`) });
  await expect(sheet).toBeVisible();
  // Focus lands on the weight field.
  await expect(sheet.getByLabel('Weight on the scale')).toBeFocused();
  await page.keyboard.type('6.5');
  await expect(sheet.getByRole('button', { name: /^Confirm ₱/ })).toBeEnabled();
  await tabTo(page, (el) => el.text.startsWith('Confirm ₱'), 10);
  await page.keyboard.press('Enter');
  await expect(sheet).toBeHidden();
  await expect(page.getByTestId(`order-${a.code}`).getByText(/Weighed 6\.5 kg/)).toBeVisible();
  // The toast was announced politely.
  await expect(page.locator('.toast-region[aria-live="polite"]')).toContainText('weighed: 6.5 kg');
});

test('the sheet traps focus, Esc closes it and focus returns to the opener', async ({ page }) => {
  const [, b] = seeded;
  await page.goto('/');
  const opener = page.getByTestId(`order-${b.code}`).getByRole('button', { name: 'Weigh' });
  await opener.focus();
  await page.keyboard.press('Enter');
  const sheet = page.getByRole('dialog', { name: new RegExp(`Order ${b.code.slice(-4)}`) });
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAttribute('aria-modal', 'true');
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await focusedInDialog(page)).toBe(true);
  }
  await page.keyboard.press('Shift+Tab');
  expect(await focusedInDialog(page)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(opener).toBeFocused();
});

test('live regions exist for new orders and toasts; names on every control', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId(`order-${seeded[1].code}`)).toBeVisible();
  await expect(page.getByTestId('new-orders-live')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('.toast-region')).toHaveAttribute('role', 'status');
  const unnamed = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [role="tab"]')]
      .filter((el) => el.offsetParent !== null)
      .filter((el) => {
        const labelled = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title');
        const label = (el as HTMLInputElement).labels?.length;
        return !labelled && !label && !(el.textContent ?? '').trim() && !(el as HTMLInputElement).placeholder;
      })
      .map((el) => el.outerHTML.slice(0, 80)),
  );
  expect(unnamed).toEqual([]);
});

test.describe('reduced motion', () => {
  test('the sheet opens without its slide animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByTestId(`order-${seeded[1].code}`).getByRole('button', { name: 'Weigh' }).click();
    const dur = await page.locator('.sheet').evaluate((el) => getComputedStyle(el).animationDuration);
    expect(parseFloat(dur)).toBeLessThan(0.01);
  });
});
