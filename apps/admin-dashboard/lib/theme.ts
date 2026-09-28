import { STATUS_META, type OrderStatus } from '@wash-and-go/domain';

// Chrome colors resolve to CSS variables (light/dark flip in globals.css).
// Brand + semantic stay literal hex — they're constant across themes. For a
// translucent fill of any of these use tint(), never `color + '1A'`: on a var()
// colour that concatenation is invalid CSS and the fill silently disappears.
export const c = {
  brand: '#208AEF',
  bg: 'var(--bg)',
  surface: 'var(--surface)',
  surface2: 'var(--surface-2)',
  border: 'var(--border)',
  text: 'var(--text)',
  muted: 'var(--muted)',
  success: '#15A34A',
  danger: '#DC2626',
  warning: '#B45309',
};

// Status color from the domain's semantic tone (one source for status color).
export function statusColor(s: OrderStatus): string {
  switch (STATUS_META[s].tone) {
    case 'success':
      return c.success;
    case 'cancelled':
      return c.danger;
    case 'active':
      return c.brand;
    default:
      return c.muted;
  }
}

const HEX6 = /^#[0-9a-f]{6}$/i;

// Translucent fill of a theme colour (chip / badge / shape backgrounds). `alpha`
// is the hex alpha byte the call sites always used ('1A' ≈ 10%). A hex colour
// gets the byte appended (the same 8-digit fill as before); a CSS variable is
// mixed with transparent, so it still follows the light/dark theme.
export function tint(color: string, alpha = '1A'): string {
  if (HEX6.test(color)) return color + alpha;
  const pct = Math.round((parseInt(alpha, 16) / 255) * 100);
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}
