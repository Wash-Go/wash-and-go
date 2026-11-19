// Staff page access. Decided by the shop-scoped role (GET /shop/me myRole),
// not the account's global roles: an account can hold SHOP_OWNER for one
// shop while being STAFF at the shop the API resolves.
export function staffAccess(myRole: 'OWNER' | 'STAFF' | undefined): { known: boolean; manage: boolean } {
  if (!myRole) return { known: false, manage: false };
  return { known: true, manage: myRole === 'OWNER' };
}
