import { STATUS_META, type OrderStatus } from '@wash-and-go/domain';

// Every colour resolves to a DESIGN.md token CSS variable (app/brand.css), so
// light/dark flips in one place and nothing hard-codes a hex here. For a
// translucent fill use tint(), never `color + '1A'`: on a var() colour that
// concatenation is invalid CSS and the fill silently disappears.
export const c = {
  brand: 'var(--navy)',
  onBrand: 'var(--on-navy)',
  bg: 'var(--ground)',
  surface: 'var(--surface)',
  surface2: 'var(--sunken)',
  border: 'var(--line)',
  text: 'var(--text)',
  muted: 'var(--muted)',
  success: 'var(--success)',
  danger: 'var(--danger)',
  warning: 'var(--warn-ink)',
};

// Status color from the domain's semantic tone (one source for status color).
export function statusColor(s: OrderStatus): string {
  switch (STATUS_META[s].tone) {
    case 'success':
      return c.success;
    case 'cancelled':
      return c.muted; // DESIGN.md: never danger for a plain cancelled status
    case 'active':
      return c.brand;
    default:
      return c.muted;
  }
}

const HEX6 = /^#[0-9a-f]{6}$/i;

// Translucent fill of a theme colour (status chip background). `alpha` is the
// hex alpha byte ('1A' ≈ 10%). A hex colour gets the byte appended (the same
// 8-digit fill as before); a CSS variable is mixed with transparent, so it still
// follows the light/dark theme. Same helper as the admin's lib/theme.
export function tint(color: string, alpha = '1A'): string {
  if (HEX6.test(color)) return color + alpha;
  const pct = Math.round((parseInt(alpha, 16) / 255) * 100);
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

// ---------- Light / dark (B8) ----------
// Light by default on every device (DESIGN.md: light-first for bright rooms
// and budget screens); dark only when chosen here, per device. The tokens for
// both live in app/brand.css under :root and :root[data-theme='dark'].
export type ThemeName = 'light' | 'dark';
export const THEME_KEY = 'wg-portal-theme';

export function resolveTheme(stored: string | null | undefined): ThemeName {
  return stored === 'dark' ? 'dark' : 'light';
}

// Inlined in <head> (app/layout.tsx) so a dark choice applies before the
// first paint; any storage error leaves the light default.
export const THEME_BOOT_SCRIPT = `try{if(localStorage.getItem('${THEME_KEY}')==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}`;
