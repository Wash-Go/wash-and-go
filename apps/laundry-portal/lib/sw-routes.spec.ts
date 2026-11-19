import { isCacheableApiGet, SW_CLAIM, SW_SIGNED_OUT, swControl } from './sw-routes';

const API = 'https://api.washandgo.ph';
const SELF = 'https://partner.washandgo.ph';

describe('isCacheableApiGet', () => {
  it('caches GETs to the configured API origin', () => {
    expect(isCacheableApiGet(new URL(`${API}/orders?limit=20`), 'GET', SELF, API)).toBe(true);
    expect(isCacheableApiGet(new URL(`${API}/shop/remittance/batches`), 'GET', SELF, API)).toBe(true);
  });

  it('caches same-origin /api GETs', () => {
    expect(isCacheableApiGet(new URL(`${SELF}/api/orders`), 'GET', SELF, API)).toBe(true);
  });

  it('never caches writes', () => {
    for (const m of ['POST', 'PATCH', 'PUT', 'DELETE']) {
      expect(isCacheableApiGet(new URL(`${API}/orders/1/weigh`), m, SELF, API)).toBe(false);
    }
  });

  it('never caches signed upload links or the session endpoint', () => {
    expect(isCacheableApiGet(new URL(`${API}/uploads/url?key=x`), 'GET', SELF, API)).toBe(false);
    expect(isCacheableApiGet(new URL(`${API}/auth/session`), 'GET', SELF, API)).toBe(false);
  });

  it('never caches identity: who-am-I and the owned shop', () => {
    expect(isCacheableApiGet(new URL(`${API}/auth/me`), 'GET', SELF, API)).toBe(false);
    expect(isCacheableApiGet(new URL(`${API}/shop/onboarding`), 'GET', SELF, API)).toBe(false);
    expect(isCacheableApiGet(new URL(`${SELF}/api/auth/me`), 'GET', SELF, API)).toBe(false);
  });

  it('still caches the shop-scoped data reads', () => {
    expect(isCacheableApiGet(new URL(`${API}/shop/remittance/batches`), 'GET', SELF, API)).toBe(true);
  });

  it('leaves other origins and app pages alone', () => {
    expect(isCacheableApiGet(new URL('https://identitytoolkit.googleapis.com/v1/x'), 'GET', SELF, API)).toBe(false);
    expect(isCacheableApiGet(new URL(`${SELF}/payouts`), 'GET', SELF, API)).toBe(false);
  });
});

describe('swControl', () => {
  it('reads the two page → worker messages', () => {
    expect(swControl({ type: SW_SIGNED_OUT })).toBe('signed-out');
    expect(swControl({ type: SW_CLAIM })).toBe('claim');
  });

  it('ignores anything else', () => {
    expect(swControl({ type: 'SKIP_WAITING' })).toBeNull();
    expect(swControl('signed-out')).toBeNull();
    expect(swControl(null)).toBeNull();
    expect(swControl(undefined)).toBeNull();
  });
});
