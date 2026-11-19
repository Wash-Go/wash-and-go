// The x-dev-uid users prisma/seed.ts creates. DELETE /dev/users refuses them so
// a spec can't delete the bootstrap callers (dev-admin, …) every other spec
// authenticates as. Hand-mirrored (the seed defines them inline);
// dev-protected-uids.spec.ts reads seed.ts and keeps the two in sync.
export const DEV_PROTECTED_UIDS: readonly string[] = [
  'dev-customer',
  'dev-rider-1',
  'dev-rider-2',
  'dev-admin',
  'dev-shop-owner',
  'dev-pending-owner',
  'dev-pending-rider',
];
