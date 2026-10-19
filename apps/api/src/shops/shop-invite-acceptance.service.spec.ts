import { ConflictException, Logger } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { VerifiedIdentity } from '../auth/firebase.service';
import { ShopAccessService } from './shop-access.service';
import { ShopInviteAcceptanceService } from './shop-invite-acceptance.service';
import { ShopStaffService } from './shop-staff.service';
import { fakeShopPrisma } from './testing/shop-prisma.fake';

/*
 * Invite acceptance is a PRIVILEGE GRANT driven by email: the email must be the
 * VERIFIED one from the Firebase token (email_verified === true), matching is
 * on the lowercased form, it must be idempotent across every sign-in, and a
 * failure must never block sign-in.
 */

const baseUser = (id: string, over: Partial<User> = {}): User =>
  ({
    id,
    firebaseUid: `fb-${id}`,
    phone: `pending:fb-${id}`,
    displayName: id,
    roles: ['CUSTOMER'],
    createdAt: new Date(),
    disabledAt: null,
    email: null,
    ...over,
  }) as User;

const openInvite = (id: string, shopId: string, email: string, over: Record<string, unknown> = {}) => ({
  id,
  shopId,
  email,
  role: 'STAFF',
  invitedByUserId: 'uOwner',
  createdAt: new Date('2026-10-10T00:00:00Z'),
  acceptedAt: null,
  acceptedUserId: null,
  revokedAt: null,
  ...over,
});

const verified = (email: string, uid = 'fb-uN'): VerifiedIdentity => ({
  firebaseUid: uid,
  email,
  emailVerified: true,
});

function setup(opts: { users?: User[]; invites?: Array<Record<string, unknown> & { id: string }>; members?: Array<Record<string, unknown> & { id: string }> } = {}) {
  const fake = fakeShopPrisma({
    shop: [{ id: 'sA' }, { id: 'sB' }, { id: 'sOwn' }],
    user: [
      baseUser('uOwner', { roles: ['CUSTOMER', 'SHOP_OWNER'], email: 'owner@example.com' }),
      baseUser('uN'),
      ...(opts.users ?? []),
    ] as never,
    shopMember: [
      { id: 'mOwner', shopId: 'sA', userId: 'uOwner', role: 'OWNER', createdAt: new Date() },
      ...(opts.members ?? []),
    ],
    shopInvite: (opts.invites ?? [openInvite('iA', 'sA', 'new@example.com')]) as never,
  });
  const svc = new ShopInviteAcceptanceService(fake.prisma);
  const t = fake.tables;
  const userRow = (id: string) => t.user.find((u) => u.id === id)! as unknown as User;
  return { svc, t, userRow, prisma: fake.prisma };
}

describe('ShopInviteAcceptanceService.onSignIn', () => {
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;
  let log: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('a verified email with an open invite joins as STAFF, gains SHOP_STAFF, marks the invite accepted', async () => {
    const { svc, t, userRow } = setup();
    const out = await svc.onSignIn(userRow('uN'), verified('new@example.com'));
    expect(t.shopMember.filter((m) => m.userId === 'uN')).toEqual([
      expect.objectContaining({ shopId: 'sA', userId: 'uN', role: 'STAFF' }),
    ]);
    expect(out.roles).toEqual(['CUSTOMER', 'SHOP_STAFF']);
    expect(userRow('uN').roles).toEqual(['CUSTOMER', 'SHOP_STAFF']);
    expect(t.shopInvite[0]).toMatchObject({ acceptedUserId: 'uN', revokedAt: null });
    expect(t.shopInvite[0].acceptedAt).toBeInstanceOf(Date);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'shop.invite.accepted', userId: 'uN', shopId: 'sA', inviteId: 'iA' }),
    );
  });

  it('stores the verified email lowercased on the user', async () => {
    const { svc, userRow } = setup();
    await svc.onSignIn(userRow('uN'), verified('  New@Example.COM '));
    expect(userRow('uN').email).toBe('new@example.com');
  });

  it('matches case-insensitively (token email in mixed case)', async () => {
    const { svc, t, userRow } = setup();
    await svc.onSignIn(userRow('uN'), verified('NEW@example.com'));
    expect(t.shopMember.some((m) => m.userId === 'uN')).toBe(true);
  });

  it.each([
    ['email_verified false', { firebaseUid: 'fb-uN', email: 'new@example.com', emailVerified: false }],
    ['email_verified missing', { firebaseUid: 'fb-uN', email: 'new@example.com' }],
    ['no email at all (phone sign-in)', { firebaseUid: 'fb-uN', phone: '+639171234567' }],
  ])('%s → no grant, invite stays open, email not stored', async (_l, identity) => {
    const { svc, t, userRow } = setup();
    const out = await svc.onSignIn(userRow('uN'), identity as VerifiedIdentity);
    expect(t.shopMember.some((m) => m.userId === 'uN')).toBe(false);
    expect(out.roles).toEqual(['CUSTOMER']);
    expect(t.shopInvite[0]).toMatchObject({ acceptedAt: null, acceptedUserId: null });
    expect(userRow('uN').email).toBeNull();
  });

  it('a previously stored email is cleared when the token no longer carries a verified one', async () => {
    const { svc, userRow } = setup({ users: [] });
    const u = userRow('uN');
    (u as { email: string | null }).email = 'old@example.com';
    await svc.onSignIn(u, { firebaseUid: 'fb-uN', email: 'old@example.com', emailVerified: false });
    expect(userRow('uN').email).toBeNull();
  });

  it('is idempotent: repeated sign-ins create one member, one role, one acceptance', async () => {
    const { svc, t, userRow } = setup();
    await svc.onSignIn(userRow('uN'), verified('new@example.com'));
    const acceptedAt = t.shopInvite[0].acceptedAt;
    for (let i = 0; i < 3; i++) await svc.onSignIn(userRow('uN'), verified('new@example.com'));
    expect(t.shopMember.filter((m) => m.userId === 'uN')).toHaveLength(1);
    expect(userRow('uN').roles).toEqual(['CUSTOMER', 'SHOP_STAFF']);
    expect(t.shopInvite[0].acceptedAt).toBe(acceptedAt);
  });

  it('a revoked invite grants nothing', async () => {
    const { svc, t, userRow } = setup({
      invites: [openInvite('iA', 'sA', 'new@example.com', { revokedAt: new Date() })],
    });
    await svc.onSignIn(userRow('uN'), verified('new@example.com'));
    expect(t.shopMember.some((m) => m.userId === 'uN')).toBe(false);
    expect(userRow('uN').roles).toEqual(['CUSTOMER']);
  });

  it('an invite already accepted by someone else grants nothing to a second account with that email', async () => {
    const { svc, t, userRow } = setup({
      invites: [openInvite('iA', 'sA', 'new@example.com', { acceptedAt: new Date(), acceptedUserId: 'uOther' })],
    });
    await svc.onSignIn(userRow('uN'), verified('new@example.com'));
    expect(t.shopMember.some((m) => m.userId === 'uN')).toBe(false);
    expect(t.shopInvite[0].acceptedUserId).toBe('uOther');
  });

  it('a user who owns a shop is NOT auto-joined: logged, invite left open', async () => {
    const { svc, t, userRow } = setup({
      users: [baseUser('uO2', { roles: ['CUSTOMER', 'SHOP_OWNER'] })],
      members: [{ id: 'mO2', shopId: 'sOwn', userId: 'uO2', role: 'OWNER', createdAt: new Date() }],
    });
    const out = await svc.onSignIn(userRow('uO2'), verified('new@example.com', 'fb-uO2'));
    expect(t.shopMember.filter((m) => m.userId === 'uO2')).toHaveLength(1);
    expect(out.roles).toEqual(['CUSTOMER', 'SHOP_OWNER']);
    expect(t.shopInvite[0]).toMatchObject({ acceptedAt: null, acceptedUserId: null });
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'shop.invite.skipped_owner', userId: 'uO2', inviteIds: ['iA'] }),
    );
  });

  it('already a member of the inviting shop: marks accepted, no duplicate member, role ensured', async () => {
    const { svc, t, userRow } = setup({
      members: [{ id: 'mN', shopId: 'sA', userId: 'uN', role: 'STAFF', createdAt: new Date() }],
    });
    await svc.onSignIn(userRow('uN'), verified('new@example.com'));
    expect(t.shopMember.filter((m) => m.userId === 'uN')).toHaveLength(1);
    expect(t.shopInvite[0].acceptedUserId).toBe('uN');
    expect(userRow('uN').roles).toContain('SHOP_STAFF');
  });

  it('open invites from two shops are both accepted', async () => {
    const { svc, t, userRow } = setup({
      invites: [openInvite('iA', 'sA', 'new@example.com'), openInvite('iB', 'sB', 'new@example.com')],
    });
    await svc.onSignIn(userRow('uN'), verified('new@example.com'));
    expect(t.shopMember.filter((m) => m.userId === 'uN').map((m) => m.shopId).sort()).toEqual(['sA', 'sB']);
  });

  it('only the matching email is granted — other invites are untouched', async () => {
    const { svc, t, userRow } = setup({
      invites: [openInvite('iA', 'sA', 'new@example.com'), openInvite('iX', 'sB', 'someone@example.com')],
    });
    await svc.onSignIn(userRow('uN'), verified('new@example.com'));
    expect(t.shopInvite.find((i) => i.id === 'iX')).toMatchObject({ acceptedAt: null });
    expect(t.shopMember.some((m) => m.shopId === 'sB')).toBe(false);
  });

  it('a disabled user is never granted', async () => {
    const { svc, t, userRow } = setup({ users: [baseUser('uD', { disabledAt: new Date() })] });
    await svc.onSignIn(userRow('uD'), verified('new@example.com', 'fb-uD'));
    expect(t.shopMember.some((m) => m.userId === 'uD')).toBe(false);
    expect(t.shopInvite[0].acceptedAt).toBeNull();
  });

  it('a failure inside acceptance never blocks sign-in (logged, user returned, nothing granted)', async () => {
    const { svc, userRow, prisma } = setup();
    (prisma as { shopInvite: { findMany: unknown } }).shopInvite.findMany = () =>
      Promise.reject(new Error('db down'));
    const u = userRow('uN');
    await expect(svc.onSignIn(u, verified('new@example.com'))).resolves.toMatchObject({ id: 'uN' });
    expect(error).toHaveBeenCalled();
  });

  it('full lifecycle: invite → dup 409 → revoke → re-invite → accept on sign-in → remove → roles cleaned → re-invite → accept again', async () => {
    const { svc, t, userRow, prisma } = setup({ invites: [] });
    const staff = new ShopStaffService(prisma, new ShopAccessService(prisma));

    const inv = await staff.createInvite('uOwner', 'New@Example.com');
    await expect(staff.createInvite('uOwner', 'new@example.com')).rejects.toBeInstanceOf(ConflictException);
    await staff.revokeInvite('uOwner', inv.id);

    // Signing in while revoked grants nothing.
    await svc.onSignIn(userRow('uN'), verified('new@example.com'));
    expect(t.shopMember.some((m) => m.userId === 'uN')).toBe(false);

    await staff.createInvite('uOwner', 'new@example.com');
    await svc.onSignIn(userRow('uN'), verified('new@example.com'));
    const members = await staff.listMembers('uOwner');
    const mine = members.find((m) => m.userId === 'uN')!;
    expect(mine).toMatchObject({ role: 'STAFF', email: 'new@example.com' });
    expect(await staff.listInvites('uOwner')).toEqual([]);
    // Now a member → inviting again is a 409.
    await expect(staff.createInvite('uOwner', 'new@example.com')).rejects.toBeInstanceOf(ConflictException);

    await staff.removeMember('uOwner', mine.id);
    expect(userRow('uN').roles).toEqual(['CUSTOMER']);
    // Signing in again after removal does NOT re-join (invite was consumed).
    await svc.onSignIn(userRow('uN'), verified('new@example.com'));
    expect(t.shopMember.some((m) => m.userId === 'uN')).toBe(false);

    await staff.createInvite('uOwner', 'new@example.com');
    await svc.onSignIn(userRow('uN'), verified('new@example.com'));
    expect(t.shopMember.filter((m) => m.userId === 'uN')).toHaveLength(1);
    expect(userRow('uN').roles).toEqual(['CUSTOMER', 'SHOP_STAFF']);
    expect(t.shopInvite).toHaveLength(1);
  });
});
