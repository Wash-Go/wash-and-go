// Hand-authored to mirror the Prisma enums (apps/api schema). Kept dependency-
// free so React Native / Metro can import it without pulling @prisma/client
// (a server-only package). Parity with the DB enums is covered by a test.

export const ORDER_STATUSES = [
  'BOOKED',
  'ASSIGNED',
  'PICKED_UP',
  'AT_SHOP',
  'PROCESSING',
  'READY_FOR_RETURN',
  'OUT_FOR_RETURN',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const SERVICE_TYPES = ['SCHEDULED', 'EXPRESS'] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

// `tone` is a semantic token, not a color. The app maps tone -> its palette so
// the design system stays in the app, not in shared domain code.
export type StatusTone = 'pending' | 'active' | 'success' | 'cancelled';

export interface StatusMeta {
  label: string; // human-facing (design review: humanized labels)
  step: number; // 0-based position on the express timeline; CANCELLED = -1
  terminal: boolean;
  tone: StatusTone;
}

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  BOOKED: { label: 'Booked', step: 0, terminal: false, tone: 'pending' },
  ASSIGNED: { label: 'Rider assigned', step: 1, terminal: false, tone: 'active' },
  PICKED_UP: { label: 'Picked up', step: 2, terminal: false, tone: 'active' },
  AT_SHOP: { label: 'At the shop', step: 3, terminal: false, tone: 'active' },
  PROCESSING: { label: 'Washing', step: 4, terminal: false, tone: 'active' },
  READY_FOR_RETURN: {
    label: 'Ready for return',
    step: 5,
    terminal: false,
    tone: 'active',
  },
  OUT_FOR_RETURN: {
    label: 'Out for delivery',
    step: 6,
    terminal: false,
    tone: 'active',
  },
  DELIVERED: { label: 'Delivered', step: 7, terminal: true, tone: 'success' },
  CANCELLED: { label: 'Cancelled', step: -1, terminal: true, tone: 'cancelled' },
};

// The express happy-path timeline, in order (excludes CANCELLED).
export const EXPRESS_TIMELINE: OrderStatus[] = ORDER_STATUSES.filter(
  (s) => STATUS_META[s].step >= 0,
).sort((a, b) => STATUS_META[a].step - STATUS_META[b].step);

export function statusLabel(s: OrderStatus): string {
  return STATUS_META[s].label;
}

export function isTerminal(s: OrderStatus): boolean {
  return STATUS_META[s].terminal;
}
