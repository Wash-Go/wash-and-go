import { STATUS_META, type OrderStatus, type ShopStatus } from '@wash-and-go/domain';

// Status chip data: word + phase colour + icon (DESIGN.md: status is always
// icon + word + colour). Pure, so the mapping is tested without React; the
// Chip component turns `icon` into a Lucide glyph and `tone` into a class.

// DESIGN.md phases: moving (sky tint), at the shop (shop tint), delivered
// (success tint), cancelled (neutral). "needs" = peach + accent outline;
// "warn" = limits, deltas and waiting states.
export type ChipTone = 'needs' | 'move' | 'shop' | 'done' | 'cancel' | 'warn';

export type ChipIcon =
  | 'clock'
  | 'bike'
  | 'store'
  | 'shirt'
  | 'package'
  | 'check'
  | 'x'
  | 'alert'
  | 'file';

export interface ChipSpec {
  label: string;
  tone: ChipTone;
  icon: ChipIcon;
}

const ORDER_PHASE: Record<OrderStatus, { tone: ChipTone; icon: ChipIcon }> = {
  BOOKED: { tone: 'move', icon: 'clock' },
  ASSIGNED: { tone: 'move', icon: 'bike' },
  PICKED_UP: { tone: 'move', icon: 'bike' },
  AT_SHOP: { tone: 'shop', icon: 'store' },
  PROCESSING: { tone: 'shop', icon: 'shirt' },
  READY_FOR_RETURN: { tone: 'shop', icon: 'package' },
  OUT_FOR_RETURN: { tone: 'move', icon: 'bike' },
  DELIVERED: { tone: 'done', icon: 'check' },
  CANCELLED: { tone: 'cancel', icon: 'x' },
};

// Portal-only states (not order statuses).
export const PORTAL_CHIPS = {
  NEEDS_YOU: { label: 'Needs you', tone: 'needs', icon: 'alert' },
  UNDER_REVIEW: { label: 'Under review', tone: 'warn', icon: 'clock' },
  VERIFIED: { label: 'Verified', tone: 'done', icon: 'check' },
  TRANSFER_PENDING: { label: 'Transfer pending', tone: 'move', icon: 'clock' },
  PAID: { label: 'Paid', tone: 'done', icon: 'check' },
} as const satisfies Record<string, ChipSpec>;

// Labels come from packages/domain so every surface says the same word.
// `needsYou` is actor-relative: when the shop must act, it overrides the phase.
export function orderChip(status: OrderStatus, opts: { needsYou?: boolean } = {}): ChipSpec {
  if (opts.needsYou) return PORTAL_CHIPS.NEEDS_YOU;
  return { label: STATUS_META[status].label, ...ORDER_PHASE[status] };
}

export function shopStatusChip(status: ShopStatus): ChipSpec {
  switch (status) {
    case 'VERIFIED':
      return PORTAL_CHIPS.VERIFIED;
    case 'SUBMITTED':
      return PORTAL_CHIPS.UNDER_REVIEW;
    case 'REJECTED':
      return { label: 'Needs changes', tone: 'needs', icon: 'alert' };
    default:
      return { label: 'Draft', tone: 'cancel', icon: 'file' };
  }
}
