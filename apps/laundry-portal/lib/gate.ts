import type { OwnerShopView, UserRole } from '@wash-and-go/domain';

// Where a signed-in account lands, from GET /auth/me roles + GET /shop/onboarding.
// - no shop role                → "This console is for partner laundries" (B9)
// - owner, shop not VERIFIED    → onboarding / under review
// - owner, no shop yet          → onboarding (start the wizard)
// - owner of a VERIFIED shop    → Orders
// - staff (owns no shop)        → Orders; the API scopes the queue by ShopMember
// The shop is never chosen client-side: the API derives it from the caller.
export type Gate =
  | { kind: 'not-a-shop' }
  | { kind: 'onboarding'; shop: OwnerShopView | null }
  | { kind: 'ready'; shop: OwnerShopView | null };

export function isShopAccount(roles: readonly string[]): boolean {
  return roles.includes('SHOP_OWNER') || roles.includes('SHOP_STAFF');
}

export function resolveGate(roles: readonly (UserRole | string)[], shop: OwnerShopView | null): Gate {
  if (!isShopAccount(roles)) return { kind: 'not-a-shop' };
  if (shop) return shop.status === 'VERIFIED' ? { kind: 'ready', shop } : { kind: 'onboarding', shop };
  if (roles.includes('SHOP_STAFF')) return { kind: 'ready', shop: null };
  return { kind: 'onboarding', shop: null };
}
