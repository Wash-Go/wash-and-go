import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ShopAccessService } from './shop-access.service';
import { ShopInviteAcceptanceService } from './shop-invite-acceptance.service';
import { ShopStaffService } from './shop-staff.service';
import { ShopRemittanceService } from '../remittance/shop-remittance.service';
import { RemittanceRepository } from '../remittance/remittance.repository';

/*
 * B4a/B5a against real Postgres. The fake can't prove the raw SQL
 * (SELECT … FOR UPDATE on "User", array_append/array_remove on the UserRole[]
 * column with an enum cast), the DB CHECKs on lowercase emails / STAFF role,
 * or the remittance aggregate. Seeds an owner + shop + invitee, runs the real
 * services, cleans up after.
 */
const SUFFIX = `${Date.now()}`;
const TAIL = SUFFIX.slice(-7);
const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

describe('Shop invites + remittance reads (Postgres)', () => {
  const prisma = new PrismaService();
  const access = new ShopAccessService(prisma);
  const staff = new ShopStaffService(prisma, access);
  const invites = new ShopInviteAcceptanceService(prisma);
  const remittance = new ShopRemittanceService(new RemittanceRepository(prisma), access);

  const email = `invitee-${SUFFIX}@example.com`;
  let ownerId: string;
  let inviteeId: string;
  let shopId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    await prisma.$connect();
    const owner = await prisma.user.create({
      data: {
        firebaseUid: `inv-owner-${SUFFIX}`,
        phone: `+63918${TAIL}`,
        displayName: 'Owner',
        roles: ['CUSTOMER', 'SHOP_OWNER'],
      },
    });
    const invitee = await prisma.user.create({
      data: {
        firebaseUid: `inv-staff-${SUFFIX}`,
        phone: `+63919${TAIL}`,
        displayName: 'Invitee',
        roles: ['CUSTOMER'],
        email,
      },
    });
    ownerId = owner.id;
    inviteeId = invitee.id;
    userIds.push(ownerId, inviteeId);
    const shop = await prisma.shop.create({
      data: { name: `Invite Shop ${SUFFIX}`, address: 'Test', lat: D('6.9'), lng: D('122.07') },
    });
    shopId = shop.id;
    await prisma.shopMember.create({ data: { shopId, userId: ownerId, role: 'OWNER' } });
  });

  afterAll(async () => {
    await prisma.shopInvite.deleteMany({ where: { shopId } });
    await prisma.shopMember.deleteMany({ where: { shopId } });
    await prisma.shop.deleteMany({ where: { id: shopId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('the DB refuses a mixed-case invite email and a non-STAFF role (CHECKs)', async () => {
    await expect(
      prisma.shopInvite.create({
        data: { shopId, email: 'Mixed@Example.com', invitedByUserId: ownerId },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.shopInvite.create({
        data: { shopId, email: `x-${SUFFIX}@example.com`, role: 'OWNER', invitedByUserId: ownerId },
      }),
    ).rejects.toThrow();
  });

  it('invite → accept grants STAFF + SHOP_STAFF via the raw SQL; replay returns the same member', async () => {
    const inv = await staff.createInvite(ownerId, email.toUpperCase());
    expect(inv.email).toBe(email);
    await expect(staff.createInvite(ownerId, email)).rejects.toBeInstanceOf(ConflictException);

    const invitee = await prisma.user.findUniqueOrThrow({ where: { id: inviteeId } });
    const member = await invites.accept(invitee, inv.id);
    expect(member).toMatchObject({ shopId, userId: inviteeId, role: 'STAFF' });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: inviteeId } });
    expect(after.roles).toEqual(['CUSTOMER', 'SHOP_STAFF']);

    // Idempotent replay (B6a item 6): same view, still one role entry.
    await expect(invites.accept(after, inv.id)).resolves.toEqual(member);
    const again = await prisma.user.findUniqueOrThrow({ where: { id: inviteeId } });
    expect(again.roles).toEqual(['CUSTOMER', 'SHOP_STAFF']);
    expect(await prisma.shopMember.count({ where: { shopId, userId: inviteeId } })).toBe(1);

    // A current member can't be re-invited.
    await expect(staff.createInvite(ownerId, email)).rejects.toBeInstanceOf(ConflictException);
  });

  it('removing the member strips SHOP_STAFF; replaying the accept is then a 404', async () => {
    const [m] = (await staff.listMembers(ownerId)).filter((x) => x.userId === inviteeId);
    await staff.removeMember(ownerId, m.id);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: inviteeId } });
    expect(u.roles).toEqual(['CUSTOMER']);
    const inv = await prisma.shopInvite.findFirstOrThrow({ where: { shopId, email } });
    await expect(invites.accept(u, inv.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('re-invite reopens the same row and can be accepted again', async () => {
    const before = await prisma.shopInvite.findFirstOrThrow({ where: { shopId, email } });
    const inv = await staff.createInvite(ownerId, email);
    expect(inv.id).toBe(before.id);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: inviteeId } });
    await expect(invites.accept(u, inv.id)).resolves.toMatchObject({ role: 'STAFF' });
  });

  it('pending remittance aggregates in Postgres: 0.00 for a shop with no lines', async () => {
    await expect(remittance.pending(ownerId)).resolves.toEqual({
      totalPhp: '0.00',
      lineCount: 0,
      oldestLineAt: null,
    });
    await expect(remittance.batchDetail(ownerId, 'no-such-batch')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
