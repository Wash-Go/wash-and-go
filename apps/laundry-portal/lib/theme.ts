import { STATUS_META, type OrderStatus } from '@wash-and-go/domain';

// Chrome colors resolve to CSS variables (light/dark flip in globals.css).
// Brand + semantic stay literal hex — constant across themes, used in alpha math.
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
