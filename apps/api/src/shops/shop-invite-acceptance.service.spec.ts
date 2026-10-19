import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { ShopAccessService } from './shop-access.service';
import { ShopInviteAcceptanceService } from './shop-invite-acceptance.service';
import { ShopStaffService } from './shop-staff.service';
import { fakeShopPrisma } from './testing/shop-prisma.fake';

/*
 * Invite acceptance is a PRIVILEGE GRANT driven by email, so it is explicit:
 * the invitee lists their pending invites and accepts one. Matching uses only
 * the caller's stored User.email, which POST /auth/session writes solely from
 * a VERIFIED token email (password / google.com / emailLink). Anything that
 * doesn't match is a 404 that doesn't say why.
 */

const baseUser = (id: string, over: Partial<User> = {}): User =>
  ({
    id,
    firebaseUid: `fb-${id}`,
    phone: `pending:fb-${id}`,
    displayName: `Name ${id}`,
    roles: ['CUSTOMER'],
    createdAt: new Date(),
    disabledAt: null,
    email: null,
    ...over,
  }) as User;

const openInvite = (
  id: string,
  shopId: string,
  email: string,
  over: Record<string, unknown> = {},
) => ({
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

type Seed = Array<Record<string, unknown> & { id: string }>;

function setup(opts: { users?: User[]; invites?: Seed; members?: Seed } = {}) {
  const fake = fakeShopPrisma({
    shop: [
      { id: 'sA', name: 'Suds A' },
      { id: 'sB', name: 'Suds B' },
      { id: 'sOwn', name: 'Own Shop' },
    ],
    user: [
      baseUser('uOwner', {
        roles: ['CUSTOMER', 'SHOP_OWNER'],
        email: 'owner@example.com',
        displayName: 'Olga Owner',
      }),
      baseUser('uOwnerB', {
        roles: ['CUSTOMER', 'SHOP_OWNER'],
        email: 'ownerb@example.com',
        displayName: 'Ben Owner',
      }),
      baseUser('uN', { email: 'new@example.com' }),
      ...(opts.users ?? []),
    ] as never,
    shopMember: [
      {
        id: 'mOwner',
        shopId: 'sA',
        userId: 'uOwner',
        role: 'OWNER',
        createdAt: new Date(),
      },
      {
        id: 'mOwnerB',
        shopId: 'sB',
        userId: 'uOwnerB',
        role: 'OWNER',
        createdAt: new Date(),
      },
      ...(opts.members ?? []),
    ],
    shopInvite: (opts.invites ?? [openInvite('iA', 'sA', 'new@example.com')]) as never,
  });
  const svc = new ShopInviteAcceptanceService(fake.prisma);
  const t = fake.tables;
  const userRow = (id: string) => t.user.find((u) => u.id === id)! as unknown as User;
  const staff = new ShopStaffService(fake.prisma, new ShopAccessService(fake.prisma));
  return { svc, t, userRow, staff, prisma: fake.prisma, raw: fake.raw };
}

describe('ShopInviteAcceptanceService', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  describe('GET /shop/invites/pending', () => {
    it('lists the caller’s open invites with shop and inviter names', async () => {
      const { svc, userRow } = setup({
        invites: [
          openInvite('iA', 'sA', 'new@example.com'),
          openInvite('iB', 'sB', 'new@example.com', {
            invitedByUserId: 'uOwnerB',
            createdAt: new Date('2026-10-11T00:00:00Z'),
          }),
        ],
      });
      await expect(svc.pending(userRow('uN'))).resolves.toEqual([
        {
          id: 'iA',
          shopName: 'Suds A',
          invitedByName: 'Olga Owner',
          createdAt: '2026-10-10T00:00:00.000Z',
        },
        {
          id: 'iB',
          shopName: 'Suds B',
          invitedByName: 'Ben Owner',
          createdAt: '2026-10-11T00:00:00.000Z',
        },
      ]);
    });

    it('omits revoked, accepted and other-email invites', async () => {
      const { svc, userRow } = setup({
        invites: [
          openInvite('iR', 'sA', 'new@example.com', { revokedAt: new Date() }),
          openInvite('iX', 'sB', 'new@example.com', {
            acceptedAt: new Date(),
            acceptedUserId: 'uZ',
          }),
          openInvite('iO', 'sOwn', 'other@example.com'),
        ],
      });
      await expect(svc.pending(userRow('uN'))).resolves.toEqual([]);
    });

    it('a user without a verified email gets [] (never an unverified email’s invites)', async () => {
      const { svc } = setup();
      await expect(svc.pending(baseUser('uNoEmail'))).resolves.toEqual([]);
    });

    it('never exposes the invitee email', async () => {
      const { svc, userRow } = setup();
      expect(JSON.stringify(await svc.pending(userRow('uN')))).not.toContain('@');
    });
  });

  describe('POST /shop/invites/:id/accept', () => {
    it('joins as STAFF, gains SHOP_STAFF atomically, claims the invite, returns the member view', async () => {
      const { svc, t, userRow, raw } = setup();
      const out = await svc.accept(userRow('uN'), 'iA');
      const member = t.shopMember.find((m) => m.userId === 'uN')!;
      expect(member).toMatchObject({ shopId: 'sA', role: 'STAFF' });
      expect(out).toEqual({
        id: member.id,
        userId: 'uN',
        role: 'STAFF',
        name: 'Name uN',
        email: 'new@example.com',
        joinedAt: (member.createdAt as Date).toISOString(),
        shopId: 'sA',
        shopName: 'Suds A',
      });
      expect(userRow('uN').roles).toEqual(['CUSTOMER', 'SHOP_STAFF']);
      expect(t.shopInvite[0]).toMatchObject({
        acceptedUserId: 'uN',
        revokedAt: null,
      });
      expect(t.shopInvite[0].acceptedAt).toBeInstanceOf(Date);
      // Role grant is one conditional statement, after the user row lock.
      expect(raw.map((r) => r.sql)).toEqual([
        'SELECT id FROM "User" WHERE id = $ FOR UPDATE',
        `UPDATE "User" SET roles = array_append(roles, 'SHOP_STAFF'::"UserRole") WHERE id = $ AND NOT ('SHOP_STAFF'::"UserRole" = ANY(roles))`,
      ]);
      expect(raw.every((r) => r.values[0] === 'uN')).toBe(true);
    });

    it('logs shop.invite.accepted with ids only (no email or name)', async () => {
      const { svc, t, userRow } = setup();
      await svc.accept(userRow('uN'), 'iA');
      const memberId = t.shopMember.find((m) => m.userId === 'uN')!.id;
      expect(log).toHaveBeenCalledWith({
        event: 'shop.invite.accepted',
        shopId: 'sA',
        actorUserId: 'uN',
        inviteId: 'iA',
        memberId,
      });
      expect(JSON.stringify(log.mock.calls)).not.toMatch(/@|Name uN/);
    });

    it('repeat accept by the same user → 200 with the same member view; nothing changes', async () => {
      const { svc, t, userRow } = setup();
      const first = await svc.accept(userRow('uN'), 'iA');
      const acceptedAt = t.shopInvite[0].acceptedAt;
      log.mockClear();
      const again = await svc.accept(userRow('uN'), 'iA');
      expect(again).toEqual(first);
      expect(t.shopMember.filter((m) => m.userId === 'uN')).toHaveLength(1);
      expect(userRow('uN').roles).toEqual(['CUSTOMER', 'SHOP_STAFF']);
      expect(t.shopInvite[0].acceptedAt).toBe(acceptedAt);
      expect(log).not.toHaveBeenCalled();
    });

    it('repeat accept after the member was removed → 404 (no silent re-join)', async () => {
      const { svc, t, userRow, staff } = setup();
      const m = await svc.accept(userRow('uN'), 'iA');
      await staff.removeMember('uOwner', m.id);
      await expect(svc.accept(userRow('uN'), 'iA')).rejects.toBeInstanceOf(NotFoundException);
      expect(t.shopMember.some((x) => x.userId === 'uN')).toBe(false);
    });

    it('an invite accepted by user X is still 404 for user Y with the same email', async () => {
      const { svc, userRow } = setup({
        users: [baseUser('uY', { email: 'new@example.com' })],
      });
      await svc.accept(userRow('uN'), 'iA');
      await expect(svc.accept(userRow('uY'), 'iA')).rejects.toBeInstanceOf(NotFoundException);
    });

    it.each([
      ['revoked', [openInvite('iA', 'sA', 'new@example.com', { revokedAt: new Date() })]],
      [
        'accepted by someone else',
        [
          openInvite('iA', 'sA', 'new@example.com', {
            acceptedAt: new Date(),
            acceptedUserId: 'uZ',
          }),
        ],
      ],
      ['for another email', [openInvite('iA', 'sA', 'someone@example.com')]],
      ['unknown', []],
    ])('%s invite → 404, nothing granted', async (_l, invites) => {
      const { svc, t, userRow } = setup({ invites: invites as Seed });
      await expect(svc.accept(userRow('uN'), 'iA')).rejects.toBeInstanceOf(NotFoundException);
      expect(t.shopMember.some((m) => m.userId === 'uN')).toBe(false);
      expect(userRow('uN').roles).toEqual(['CUSTOMER']);
    });

    it('a caller without a verified email → 404 even for an invite to their (unverified) address', async () => {
      const { svc, t } = setup();
      await expect(svc.accept(baseUser('uN', { email: null }), 'iA')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(t.shopInvite[0].acceptedAt).toBeNull();
    });

    it('404 messages do not distinguish why', async () => {
      const { svc, userRow } = setup({
        invites: [
          openInvite('iA', 'sA', 'new@example.com', { revokedAt: new Date() }),
          openInvite('iX', 'sB', 'x@example.com'),
        ],
      });
      const a = await svc.accept(userRow('uN'), 'iA').catch((e: Error) => e.message);
      const b = await svc.accept(userRow('uN'), 'iX').catch((e: Error) => e.message);
      const c = await svc.accept(userRow('uN'), 'nope').catch((e: Error) => e.message);
      expect(new Set([a, b, c]).size).toBe(1);
    });

    it('409 when the caller owns a shop; invite left open', async () => {
      const { svc, t, userRow } = setup({
        users: [
          baseUser('uO2', {
            roles: ['CUSTOMER', 'SHOP_OWNER'],
            email: 'new@example.com',
          }),
        ],
        members: [
          {
            id: 'mO2',
            shopId: 'sOwn',
            userId: 'uO2',
            role: 'OWNER',
            createdAt: new Date(),
          },
        ],
      });
      const err = await svc.accept(userRow('uO2'), 'iA').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect((err as Error).message).toMatch(/one shop per account/i);
      expect(t.shopMember.filter((m) => m.userId === 'uO2')).toHaveLength(1);
      expect(t.shopInvite[0]).toMatchObject({
        acceptedAt: null,
        acceptedUserId: null,
      });
      expect(userRow('uO2').roles).toEqual(['CUSTOMER', 'SHOP_OWNER']);
    });

    it('409 when the caller is already STAFF at another shop', async () => {
      const { svc, t, userRow } = setup({
        users: [
          baseUser('uS', {
            roles: ['CUSTOMER', 'SHOP_STAFF'],
            email: 'new@example.com',
          }),
        ],
        members: [
          {
            id: 'mS',
            shopId: 'sB',
            userId: 'uS',
            role: 'STAFF',
            createdAt: new Date(),
          },
        ],
      });
      await expect(svc.accept(userRow('uS'), 'iA')).rejects.toBeInstanceOf(ConflictException);
      expect(t.shopInvite[0].acceptedAt).toBeNull();
    });

    it('the owner/staff check reads inside the transaction (after the user row lock)', async () => {
      const { svc, userRow, prisma } = setup();
      const order: string[] = [];
      const p = prisma as unknown as {
        $transaction: (fn: (tx: unknown) => unknown) => unknown;
        shopMember: { findMany: (...a: unknown[]) => unknown };
      };
      const realTx = p.$transaction;
      const realFind = p.shopMember.findMany;
      p.$transaction = async (fn) => {
        order.push('tx:begin');
        const r = await realTx(fn);
        order.push('tx:end');
        return r;
      };
      p.shopMember.findMany = (...a: unknown[]) => {
        order.push('memberships');
        return realFind(...a);
      };
      await svc.accept(userRow('uN'), 'iA');
      expect(order).toEqual(['tx:begin', 'memberships', 'tx:end']);
    });

    it('a lost claim race (count 0) → 404 and no member created', async () => {
      const { svc, t, userRow, prisma } = setup();
      (prisma as unknown as { shopInvite: { updateMany: unknown } }).shopInvite.updateMany =
        async () => ({ count: 0 });
      await expect(svc.accept(userRow('uN'), 'iA')).rejects.toBeInstanceOf(NotFoundException);
      expect(t.shopMember.some((m) => m.userId === 'uN')).toBe(false);
      expect(userRow('uN').roles).toEqual(['CUSTOMER']);
    });

    it('already STAFF at the inviting shop: claims the invite and reuses the membership', async () => {
      const { svc, t, userRow } = setup({
        members: [
          {
            id: 'mN',
            shopId: 'sA',
            userId: 'uN',
            role: 'STAFF',
            createdAt: new Date(),
          },
        ],
      });
      const out = await svc.accept(userRow('uN'), 'iA');
      expect(out.id).toBe('mN');
      expect(t.shopMember.filter((m) => m.userId === 'uN')).toHaveLength(1);
      expect(userRow('uN').roles).toEqual(['CUSTOMER', 'SHOP_STAFF']);
    });

    it('the member list shows the invitee (with name) only after acceptance', async () => {
      const { svc, staff, userRow } = setup();
      expect((await staff.listMembers('uOwner')).map((m) => m.userId)).toEqual(['uOwner']);
      await svc.accept(userRow('uN'), 'iA');
      const members = await staff.listMembers('uOwner');
      expect(members.find((m) => m.userId === 'uN')).toMatchObject({
        name: 'Name uN',
        role: 'STAFF',
      });
    });
  });

  it('full lifecycle: invite → revoke → accept 404 → re-invite → accept → remove → roles cleaned → accept 404 → re-invite → accept', async () => {
    const { svc, t, userRow, staff } = setup({ invites: [] });

    const inv = await staff.createInvite('uOwner', 'New@Example.com');
    await expect(staff.createInvite('uOwner', 'new@example.com')).rejects.toBeInstanceOf(
      ConflictException,
    );
    await staff.revokeInvite('uOwner', inv.id);
    expect(await svc.pending(userRow('uN'))).toEqual([]);
    await expect(svc.accept(userRow('uN'), inv.id)).rejects.toBeInstanceOf(NotFoundException);

    const again = await staff.createInvite('uOwner', 'new@example.com');
    expect((await svc.pending(userRow('uN'))).map((p) => p.id)).toEqual([again.id]);
    const joined = await svc.accept(userRow('uN'), again.id);
    expect(await staff.listInvites('uOwner')).toEqual([]);
    await expect(staff.createInvite('uOwner', 'new@example.com')).rejects.toBeInstanceOf(
      ConflictException,
    );

    await staff.removeMember('uOwner', joined.id);
    expect(userRow('uN').roles).toEqual(['CUSTOMER']);
    await expect(svc.accept(userRow('uN'), again.id)).rejects.toBeInstanceOf(NotFoundException);

    const third = await staff.createInvite('uOwner', 'new@example.com');
    await svc.accept(userRow('uN'), third.id);
    expect(t.shopMember.filter((m) => m.userId === 'uN')).toHaveLength(1);
    expect(userRow('uN').roles).toEqual(['CUSTOMER', 'SHOP_STAFF']);
    expect(t.shopInvite).toHaveLength(1);
  });
});
