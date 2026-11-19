import { activeTab, RAIL_ITEMS, safeNext, TAB_ITEMS } from './nav';

describe('nav', () => {
  it('has the five phone tabs in order', () => {
    expect(TAB_ITEMS.map((t) => t.label)).toEqual(['Orders', 'Services', 'Payouts', 'Shop', 'More']);
  });

  it('has the rail items with Staff and Help', () => {
    expect(RAIL_ITEMS.map((t) => t.label)).toEqual(['Orders', 'Services', 'Payouts', 'Shop', 'Staff', 'Help']);
  });

  it('marks the active section from the path', () => {
    expect(activeTab('/')).toBe('orders');
    expect(activeTab('/orders/abc')).toBe('orders');
    expect(activeTab('/payouts/b1')).toBe('payouts');
    expect(activeTab('/services')).toBe('services');
    expect(activeTab('/shop')).toBe('shop');
    expect(activeTab('/staff')).toBe('staff');
    expect(activeTab('/help')).toBe('help');
    expect(activeTab('/shopping')).toBe(null);
  });
});

describe('safeNext', () => {
  it('keeps an in-app path', () => {
    expect(safeNext('/payouts')).toBe('/payouts');
    expect(safeNext('/orders/abc?x=1')).toBe('/orders/abc?x=1');
  });

  it('falls back to Orders for anything that could leave the app', () => {
    for (const bad of [null, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/login', '/signup']) {
      expect(safeNext(bad)).toBe('/');
    }
  });
});
