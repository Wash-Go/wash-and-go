import { STATUS_META, type OrderStatus } from '@wash-and-go/domain';

export const c = {
  brand: '#208AEF',
  bg: '#F5F7FB',
  surface: '#FFFFFF',
  border: '#E4E9F0',
  text: '#111827',
  muted: '#6B7280',
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
