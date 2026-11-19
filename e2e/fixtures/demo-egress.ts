import { expect, test as base } from '@playwright/test';

/*
 * The standalone demo build must not talk to anything: every request made by
 * a page or its service worker in the test's browser context is checked, and
 * only the page's own origin and OpenStreetMap tiles (the Location map) are
 * allowed. Auto fixture: every demo test asserts it on teardown.
 */
export const ALLOWED_HOSTS = ['tile.openstreetmap.org'];

export const test = base.extend<{ egress: string[] }>({
  egress: [
    async ({ context, baseURL }, use) => {
      const origin = new URL(baseURL!).origin;
      const outside: string[] = [];
      const check = (url: string) => {
        const u = new URL(url);
        if (u.protocol === 'data:' || u.protocol === 'blob:') return;
        if (u.origin === origin || ALLOWED_HOSTS.includes(u.hostname)) return;
        outside.push(url);
      };
      context.on('request', (r) => check(r.url()));
      context.on('serviceworker', (sw) => check(sw.url()));
      await use(outside);
      expect(outside, 'requests that left the demo').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
