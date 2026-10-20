import { ORDER_STATUSES, STATUS_META } from '@wash-and-go/domain';
import { orderChip, PORTAL_CHIPS, shopStatusChip } from './status-chip';

describe('orderChip', () => {
  it('uses the domain label for every order status', () => {
    for (const s of ORDER_STATUSES) expect(orderChip(s).label).toBe(STATUS_META[s].label);
  });

  it('colours by phase: moving, at the shop, delivered, cancelled', () => {
    expect(['BOOKED', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_RETURN'].map((s) => orderChip(s as never).tone)).toEqual([
      'move',
      'move',
      'move',
      'move',
    ]);
    expect(['AT_SHOP', 'PROCESSING', 'READY_FOR_RETURN'].map((s) => orderChip(s as never).tone)).toEqual([
      'shop',
      'shop',
      'shop',
    ]);
    expect(orderChip('DELIVERED').tone).toBe('done');
    expect(orderChip('CANCELLED').tone).toBe('cancel');
  });

  it('never uses danger for a plain cancelled status', () => {
    for (const s of ORDER_STATUSES) expect(orderChip(s).tone).not.toBe('danger');
  });

  it('gives every status an icon', () => {
    for (const s of ORDER_STATUSES) expect(orderChip(s).icon).toBeTruthy();
  });

  it('lets "Needs you" override the phase for the shop', () => {
    expect(orderChip('AT_SHOP', { needsYou: true })).toEqual(PORTAL_CHIPS.NEEDS_YOU);
  });
});

describe('portal-only chips', () => {
  it('has the five portal states with their words and tones', () => {
    expect(
      Object.values(PORTAL_CHIPS).map((c) => [c.label, c.tone]),
    ).toEqual([
      ['Needs you', 'needs'],
      ['Under review', 'warn'],
      ['Verified', 'done'],
      ['Transfer pending', 'move'],
      ['Paid', 'done'],
    ]);
  });
});

describe('shopStatusChip', () => {
  it('maps the onboarding statuses', () => {
    expect(shopStatusChip('VERIFIED')).toEqual(PORTAL_CHIPS.VERIFIED);
    expect(shopStatusChip('SUBMITTED')).toEqual(PORTAL_CHIPS.UNDER_REVIEW);
    expect(shopStatusChip('DRAFT')).toMatchObject({ label: 'Draft', tone: 'cancel' });
    expect(shopStatusChip('REJECTED')).toMatchObject({ label: 'Needs changes', tone: 'needs' });
  });
});
