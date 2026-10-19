import { STATUS_META, type OrderStatus } from '@wash-and-go/domain';
import { c, statusColor, tint } from './theme';

// A chip fill used to be `color + '1A'`. For the CSS-variable chrome colours
// that produced `var(--muted)1A`, which is invalid CSS, so the browser dropped it
// and the "Booked" chip had no fill.
const VALID_FILL =
  /^(#[0-9A-F]{8}|color-mix\(in srgb, var\(--[a-z0-9-]+\) \d{1,3}%, transparent\))$/i;

describe('tint', () => {
  it('appends the alpha byte to a hex colour', () => {
    expect(tint('#0B3773')).toBe('#0B37731A');
    expect(tint('#1F7A4D', '22')).toBe('#1F7A4D22');
  });

  it('uses DESIGN.md token variables for every theme colour', () => {
    for (const v of Object.values(c)) expect(v).toMatch(/^var\(--[a-z-]+\)$/);
    expect(c.brand).toBe('var(--navy)');
  });

  it('mixes a CSS variable with transparent rather than concatenating', () => {
    expect(tint(c.muted)).toBe('color-mix(in srgb, var(--muted) 10%, transparent)');
    expect(tint(c.muted, '22')).toBe('color-mix(in srgb, var(--muted) 13%, transparent)');
  });

  it('gives every order status a valid chip fill', () => {
    for (const s of Object.keys(STATUS_META) as OrderStatus[]) {
      expect(tint(statusColor(s))).toMatch(VALID_FILL);
    }
    expect(statusColor('CANCELLED')).toBe(c.muted);
    expect(tint(statusColor('BOOKED'))).toBe(
      'color-mix(in srgb, var(--muted) 10%, transparent)',
    );
  });
});
