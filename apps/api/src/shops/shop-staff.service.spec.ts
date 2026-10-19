import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ShopAccessService } from './shop-access.service';
import { MAX_OPEN_INVITES, ShopStaffService } from './shop-staff.service';
import { fakeShopPrisma } from './testing/shop-prisma.fake';

const user = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  displayName: `Name ${id}`,
  phone: `+63917000${id.length}${id.charCodeAt(1)}`,
  email: `${id.toLowerCase()}@example.com`, // stored lowercased (DB CHECK)
  roles: ['CUSTOMER'],
  disabledAt: null,
  ...over,
});

function setup() {
  const fake = fakeShopPrisma({
    shop: [{ id: 'sA' }, { id: 'sB' }],
    user: [
      user('uA', { roles: ['CUSTOMER', 'SHOP_OWNER'] }),
      user('uS', { roles: ['CUSTOMER', 'SHOP_STAFF'] }),
      user('uT', { roles: ['CUSTOMER', 'SHOP_STAFF'] }),
      user('uB', { roles: ['CUSTOMER', 'SHOP_OWNER'] }),
      user('uX'),
    ],
    shopMember: [
      { id: 'mA', shopId: 'sA', userId: 'uA', role: 'OWNER', createdAt: new Date('2026-10-01T00:00:00Z') },
      { id: 'mS', shopId: 'sA', userId: 'uS', role: 'STAFF', createdAt: new Date('2026-10-05T00:00:00Z') },
      // uT is staff at BOTH shops.
      { id: 'mT', shopId: 'sA', userId: 'uT', role: 'STAFF', createdAt: new Date('2026-10-06T00:00:00Z') },
      { id: 'mT2', shopId: 'sB', userId: 'uT', role: 'STAFF', createdAt: new Date('2026-10-06T00:00:00Z') },
      { id: 'mB', shopId: 'sB', userId: 'uB', role: 'OWNER', createdAt: new Date('2026-10-01T00:00:00Z') },
    ],
    shopInvite: [
      { id: 'iB', shopId: 'sB', email: 'friend@example.com', role: 'STAFF', invitedByUserId: 'uB', createdAt: new Date(), acceptedAt: null, acceptedUserId: null, revokedAt: null },
    ],
  });
  const svc = new ShopStaffService(fake.prisma, new ShopAccessService(fake.prisma));
  return { svc, t: fake.tables, raw: fake.raw };
}

describe('ShopStaffService', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  describe('GET /shop/members', () => {
    it('lists the caller’s shop members with name/email, never phone', async () => {
      const { svc } = setup();
      const list = await svc.listMembers('uS');
      expect(list).toEqual([
        { id: 'mA', userId: 'uA', role: 'OWNER', name: 'Name uA', email: 'ua@example.com', joinedAt: '2026-10-01T00:00:00.000Z' },
        { id: 'mS', userId: 'uS', role: 'STAFF', name: 'Name uS', email: 'us@example.com', joinedAt: '2026-10-05T00:00:00.000Z' },
        { id: 'mT', userId: 'uT', role: 'STAFF', name: 'Name uT', email: 'ut@example.com', joinedAt: '2026-10-06T00:00:00.000Z' },
      ]);
      expect(JSON.stringify(list)).not.toContain('+63');
    });

    it('owner B sees only shop B', async () => {
      const { svc } = setup();
      expect((await svc.listMembers('uB')).map((m) => m.id)).toEqual(['mB', 'mT2']);
    });

    it('no shop → 404', async () => {
      const { svc } = setup();
      await expect(svc.listMembers('uX')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('invites', () => {
    it('creates a lowercased invite on the caller’s shop', async () => {
      const { svc, t } = setup();
      const inv = await svc.createInvite('uA', '  New.Hire@Example.COM ');
      expect(inv).toEqual({ id: expect.any(String), email: 'new.hire@example.com', createdAt: expect.any(String) });
      expect(t.shopInvite.find((i) => i.id === inv.id)).toMatchObject({
        shopId: 'sA',
        email: 'new.hire@example.com',
        role: 'STAFF',
        invitedByUserId: 'uA',
      });
    });

    it('409 when the email is already invited (open), case-insensitively', async () => {
      const { svc } = setup();
      await svc.createInvite('uA', 'new@example.com');
      await expect(svc.createInvite('uA', 'NEW@example.com')).rejects.toBeInstanceOf(ConflictException);
    });

    it('409 when the email already belongs to a member (incl. the owner)', async () => {
      const { svc } = setup();
      await expect(svc.createInvite('uA', 'US@example.com')).rejects.toBeInstanceOf(ConflictException);
      await expect(svc.createInvite('uA', 'uA@example.com')).rejects.toBeInstanceOf(ConflictException);
    });

    it('a member of ANOTHER shop can still be invited here', async () => {
      const { svc } = setup();
      await expect(svc.createInvite('uA', 'uB@example.com')).resolves.toMatchObject({ email: 'ub@example.com' });
    });

    it('the same email can be invited by a different shop (invites are per shop)', async () => {
      const { svc, t } = setup();
      await svc.createInvite('uA', 'friend@example.com');
      expect(t.shopInvite.filter((i) => i.email === 'friend@example.com')).toHaveLength(2);
    });

    it('revoke → re-invite reopens the same row', async () => {
      const { svc, t } = setup();
      const inv = await svc.createInvite('uA', 'new@example.com');
      await svc.revokeInvite('uA', inv.id);
      expect(t.shopInvite.find((i) => i.id === inv.id)!.revokedAt).toBeInstanceOf(Date);
      expect(await svc.listInvites('uA')).toEqual([]);
      const again = await svc.createInvite('uA', 'new@example.com');
      expect(again.id).toBe(inv.id);
      expect(t.shopInvite.find((i) => i.id === inv.id)).toMatchObject({ revokedAt: null, acceptedAt: null });
      expect((await svc.listInvites('uA')).map((i) => i.email)).toEqual(['new@example.com']);
    });

    it(`caps open invites at ${MAX_OPEN_INVITES} per shop (400)`, async () => {
      const { svc } = setup();
      for (let i = 0; i < MAX_OPEN_INVITES; i++) await svc.createInvite('uA', `p${i}@example.com`);
      await expect(svc.createInvite('uA', 'one-more@example.com')).rejects.toBeInstanceOf(BadRequestException);
      // Revoking frees a slot.
      const [first] = await svc.listInvites('uA');
      await svc.revokeInvite('uA', first.id);
      await expect(svc.createInvite('uA', 'one-more@example.com')).resolves.toBeDefined();
    });

    it('listInvites returns only the caller’s open invites', async () => {
      const { svc } = setup();
      await svc.createInvite('uA', 'a1@example.com');
      expect((await svc.listInvites('uA')).map((i) => i.email)).toEqual(['a1@example.com']);
      expect((await svc.listInvites('uB')).map((i) => i.email)).toEqual(['friend@example.com']);
    });

    it('owner A cannot revoke shop B’s invite (404, untouched)', async () => {
      const { svc, t } = setup();
      await expect(svc.revokeInvite('uA', 'iB')).rejects.toBeInstanceOf(NotFoundException);
      expect(t.shopInvite.find((i) => i.id === 'iB')!.revokedAt).toBeNull();
    });

    it('revoking an already revoked invite → 404', async () => {
      const { svc } = setup();
      await svc.revokeInvite('uB', 'iB');
      await expect(svc.revokeInvite('uB', 'iB')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('staff cannot create, list or revoke invites (403); no shop → 404', async () => {
      const { svc } = setup();
      await expect(svc.createInvite('uS', 'x@example.com')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.listInvites('uS')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.revokeInvite('uS', 'iB')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.createInvite('uX', 'x@example.com')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('DELETE /shop/members/:memberId', () => {
    it('removes a STAFF member and strips SHOP_STAFF when they have no other staff membership', async () => {
      const { svc, t } = setup();
      await svc.removeMember('uA', 'mS');
      expect(t.shopMember.find((m) => m.id === 'mS')).toBeUndefined();
      expect(t.user.find((u) => u.id === 'uS')!.roles).toEqual(['CUSTOMER']);
    });

    it('keeps SHOP_STAFF when the user is still staff at another shop', async () => {
      const { svc, t } = setup();
      await svc.removeMember('uA', 'mT');
      expect(t.shopMember.find((m) => m.id === 'mT2')).toBeDefined();
      expect(t.user.find((u) => u.id === 'uT')!.roles).toContain('SHOP_STAFF');
    });

    it('400 for removing an OWNER or yourself', async () => {
      const { svc, t } = setup();
      await expect(svc.removeMember('uA', 'mA')).rejects.toBeInstanceOf(BadRequestException);
      expect(t.shopMember).toHaveLength(5);
    });

    it('owner A cannot remove shop B’s member (404)', async () => {
      const { svc, t } = setup();
      await expect(svc.removeMember('uA', 'mT2')).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.removeMember('uA', 'mB')).rejects.toBeInstanceOf(NotFoundException);
      expect(t.shopMember).toHaveLength(5);
    });

    it('staff cannot remove members (403)', async () => {
      const { svc, t } = setup();
      await expect(svc.removeMember('uS', 'mT')).rejects.toBeInstanceOf(ForbiddenException);
      expect(t.shopMember).toHaveLength(5);
    });

    it('a removed member can be re-invited', async () => {
      const { svc } = setup();
      await svc.removeMember('uA', 'mS');
      await expect(svc.createInvite('uA', 'uS@example.com')).resolves.toBeDefined();
    });

    it('strips SHOP_STAFF with one conditional array_remove, after locking the user row', async () => {
      const { svc, raw } = setup();
      await svc.removeMember('uA', 'mS');
      expect(raw).toEqual([
        { sql: 'SELECT id FROM "User" WHERE id = $ FOR UPDATE', values: ['uS'] },
        {
          sql: `UPDATE "User" SET roles = array_remove(roles, 'SHOP_STAFF'::"UserRole") WHERE id = $ AND 'SHOP_STAFF'::"UserRole" = ANY(roles)`,
          values: ['uS'],
        },
      ]);
    });

    it('no role statement when they are still staff elsewhere', async () => {
      const { svc, raw } = setup();
      await svc.removeMember('uA', 'mT');
      expect(raw.map((r) => r.sql)).toEqual(['SELECT id FROM "User" WHERE id = $ FOR UPDATE']);
    });
  });

  describe('audit log lines (ids only, never email or name)', () => {
    it('shop.invite.created / shop.invite.revoked / shop.member.removed', async () => {
      const { svc } = setup();
      const inv = await svc.createInvite('uA', 'Secret.Person@Example.com');
      expect(log).toHaveBeenCalledWith({ event: 'shop.invite.created', shopId: 'sA', actorUserId: 'uA', inviteId: inv.id });
      await svc.revokeInvite('uA', inv.id);
      expect(log).toHaveBeenCalledWith({ event: 'shop.invite.revoked', shopId: 'sA', actorUserId: 'uA', inviteId: inv.id });
      await svc.removeMember('uA', 'mS');
      expect(log).toHaveBeenCalledWith({ event: 'shop.member.removed', shopId: 'sA', actorUserId: 'uA', memberId: 'mS' });
      expect(log).toHaveBeenCalledTimes(3);
      expect(JSON.stringify(log.mock.calls)).not.toMatch(/@|example|Name u/i);
    });

    it('failed changes log nothing', async () => {
      const { svc } = setup();
      await expect(svc.revokeInvite('uA', 'iB')).rejects.toBeDefined();
      await expect(svc.removeMember('uA', 'mA')).rejects.toBeDefined();
      expect(log).not.toHaveBeenCalled();
    });
  });
});
