import type { OwnerShopView } from '@wash-and-go/domain';
import { resolveGate } from './gate';

const shop = (status: OwnerShopView['status']): OwnerShopView => ({
  id: 's1',
  name: 'Tetuan Laundry Hub',
  address: '',
  lat: '0',
  lng: '0',
  status,
  rejectionReason: null,
  permitKey: null,
  photoKeys: [],
  submittedAt: null,
  verifiedAt: null,
  contactPhone: null,
  description: null,
  hours: null,
  expressSlotsPerDay: 0,
  documentsPending: false,
  logoKey: null,
  logoUrl: null,
});

describe('resolveGate', () => {
  it('sends a customer-only account to the not-a-shop screen', () => {
    expect(resolveGate(['CUSTOMER'], null)).toEqual({ kind: 'not-a-shop' });
    expect(resolveGate([], null)).toEqual({ kind: 'not-a-shop' });
    expect(resolveGate(['RIDER', 'CUSTOMER'], null)).toEqual({ kind: 'not-a-shop' });
  });

  it('opens Orders for an owner of a VERIFIED shop', () => {
    expect(resolveGate(['SHOP_OWNER'], shop('VERIFIED'))).toEqual({
      kind: 'ready',
      shop: shop('VERIFIED'),
    });
  });

  it('holds an owner whose shop is not verified on onboarding', () => {
    for (const s of ['DRAFT', 'SUBMITTED', 'REJECTED'] as const) {
      expect(resolveGate(['SHOP_OWNER', 'CUSTOMER'], shop(s))).toEqual({
        kind: 'onboarding',
        shop: shop(s),
      });
    }
  });

  it('holds an owner with no shop yet on onboarding', () => {
    expect(resolveGate(['SHOP_OWNER'], null)).toEqual({ kind: 'onboarding', shop: null });
  });

  it('opens Orders for staff (they own no shop; the API scopes their queue)', () => {
    expect(resolveGate(['SHOP_STAFF'], null)).toEqual({ kind: 'ready', shop: null });
  });

  it('still uses the owned shop when a staff member also owns a draft', () => {
    expect(resolveGate(['SHOP_STAFF', 'SHOP_OWNER'], shop('DRAFT')).kind).toBe('onboarding');
  });
});
