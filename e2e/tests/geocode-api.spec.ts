import { expect, test } from '@playwright/test';
import { API_URL } from '../playwright.config';

/*
 * API smoke for the geocode endpoint the booking flow uses — proves address →
 * coords works all the way through our stack to the live maps vendor (not just
 * the mocked unit). Runs against the API (x-dev-uid customer stub).
 */
test.describe('geocode endpoint', () => {
  test('resolves a real Zamboanga address to coordinates in range', async ({ request }) => {
    const res = await request.get(`${API_URL}/geocode?q=Tetuan Zamboanga City`, {
      headers: { 'x-dev-uid': 'dev-customer' },
    });
    expect(res.ok()).toBeTruthy();
    const hit = await res.json();
    expect(hit).not.toBeNull();
    // Zamboanga City sits around 6.9°N, 122.08°E.
    expect(hit.point.lat).toBeGreaterThan(6.8);
    expect(hit.point.lat).toBeLessThan(7.0);
    expect(hit.point.lng).toBeGreaterThan(122.0);
    expect(hit.point.lng).toBeLessThan(122.2);
    expect(typeof hit.label).toBe('string');
  });

  test('rejects a too-short query with 400', async ({ request }) => {
    const res = await request.get(`${API_URL}/geocode?q=a`, {
      headers: { 'x-dev-uid': 'dev-customer' },
    });
    expect(res.status()).toBe(400);
  });

  test('is any-authenticated — a rider can look up an address', async ({ request }) => {
    const res = await request.get(`${API_URL}/geocode?q=Tetuan`, {
      headers: { 'x-dev-uid': 'dev-rider-1' },
    });
    expect(res.ok()).toBeTruthy();
  });
});
