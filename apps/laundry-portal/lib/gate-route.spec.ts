import { gateRedirect } from './gate-route';

describe('gateRedirect', () => {
  it('sends onboarding to /onboarding and ready away from it', () => {
    expect(gateRedirect(null, 'onboarding', '/')).toBe('/onboarding');
    expect(gateRedirect(null, 'onboarding', '/onboarding')).toBeNull();
    expect(gateRedirect('onboarding', 'ready', '/onboarding')).toBe('/');
  });
  it('after an accepted invite (not-a-shop → ready) lands on Orders from any URL', () => {
    expect(gateRedirect('not-a-shop', 'ready', '/shop')).toBe('/');
    expect(gateRedirect('not-a-shop', 'ready', '/')).toBeNull();
  });
  it('leaves a ready user where they are otherwise', () => {
    expect(gateRedirect(null, 'ready', '/shop')).toBeNull();
    expect(gateRedirect('ready', 'ready', '/staff')).toBeNull();
    expect(gateRedirect(null, 'not-a-shop', '/staff')).toBeNull();
  });
});
