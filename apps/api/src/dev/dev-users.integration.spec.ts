import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DevUsersService } from './dev-users.service';

/*
 * The DELETE cascade against real FKs: a fixture owner with a solely-owned
 * shop (services, staff, invites, an order with events + rating + payout
 * line in a batch, notifications) is removed in one transaction, while a
 * shop with a second owner, and other users, survive.
 */
const SUFFIX = `${Date.now()}`;
const TAIL = SUFFIX.slice(-7);
const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

describe('DevUsersService (Postgres)', () => {
  const prisma = new PrismaService();
  const svc = new DevUsersService(prisma);
  const uid = `e2e-owner-${SUFFIX}`;
  const keepIds: string[] = [];
  let sharedShopId: string;

  beforeAll(() => prisma.$connect());
  afterAll(async () => {
    await prisma.shopMember.deleteMany({ where: { shopId: sharedShopId } });
    await prisma.shop.deleteMany({ where: { id: sharedShopId } });
    await prisma.user.deleteMany({ where: { id: { in: keepIds } } });
    await prisma.$disconnect();
  });

  it('POST upserts by uid: create with defaults, then update only the sent fields', async () => {
    const created = await svc.upsert({
      uid,
      displayName: 'Fixture Owner',
      email: 'Owner@Example.com',
    });
    expect(created).toMatchObject({
      displayName: 'Fixture Owner',
      roles: ['CUSTOMER'],
      phone: null,
      emailVerified: false,
      inviteEmailOnFile: true,
    });
    const row = await prisma.user.findUniqueOrThrow({ where: { firebaseUid: uid } });
    expect(row.email).toBe('owner@example.com');
    const updated = await svc.upsert({ uid, roles: ['CUSTOMER', 'SHOP_OWNER'] });
    expect(updated).toMatchObject({
      id: row.id,
      displayName: 'Fixture Owner',
      roles: ['CUSTOMER', 'SHOP_OWNER'],
    });
  });

  it('DELETE removes the user and everything tied to its solely-owned shop, in one go', async () => {
    const owner = await prisma.user.findUniqueOrThrow({ where: { firebaseUid: uid } });
    const staff = await prisma.user.create({
      data: {
        firebaseUid: `e2e-staff-${SUFFIX}`,
        phone: `+63915${TAIL}`,
        displayName: 'S',
        roles: ['SHOP_STAFF'],
      },
    });
    const other = await prisma.user.create({
      data: {
        firebaseUid: `e2e-other-${SUFFIX}`,
        phone: `+63916${TAIL}`,
        displayName: 'O',
        roles: ['SHOP_OWNER'],
      },
    });
    keepIds.push(staff.id, other.id);

    const shop = await prisma.shop.create({
      data: { name: `Fixture ${SUFFIX}`, address: 'x', lat: D(6.9), lng: D(122) },
    });
    const shared = await prisma.shop.create({
      data: { name: `Shared ${SUFFIX}`, address: 'x', lat: D(6.9), lng: D(122) },
    });
    sharedShopId = shared.id;
    await prisma.shopMember.createMany({
      data: [
        { shopId: shop.id, userId: owner.id, role: 'OWNER' },
        { shopId: shop.id, userId: staff.id, role: 'STAFF' },
        { shopId: shared.id, userId: owner.id, role: 'OWNER' },
        { shopId: shared.id, userId: other.id, role: 'OWNER' },
      ],
    });
    const catalog = await prisma.serviceCatalogItem.findFirstOrThrow();
    const ss = await prisma.shopService.create({
      data: { shopId: shop.id, serviceId: catalog.id, ratePhp: D(25), turnaroundHours: 24 },
    });
    await prisma.shopInvite.create({
      data: { shopId: shop.id, email: `inv-${SUFFIX}@example.com`, invitedByUserId: owner.id },
    });
    // Owner invited someone to the SHARED shop too: that row goes (FK to owner).
    await prisma.shopInvite.create({
      data: { shopId: shared.id, email: `inv2-${SUFFIX}@example.com`, invitedByUserId: owner.id },
    });

    const order = await prisma.order.create({
      data: {
        code: `WG-E2E-${SUFFIX}`,
        customerId: staff.id,
        shopId: shop.id,
        shopServiceId: ss.id,
        serviceType: 'EXPRESS',
        status: 'DELIVERED',
        pickupLat: D(6.9),
        pickupLng: D(122),
        pickupAddress: 'x',
      } as never,
    });
    await prisma.orderEvent.create({
      data: { orderId: order.id, status: 'DELIVERED', actorUserId: owner.id },
    });
    await prisma.rating.create({
      data: { orderId: order.id, shopId: shop.id, customerId: staff.id, stars: 5 } as never,
    });
    const batch = await prisma.remittanceBatch.create({
      data: {
        shopId: shop.id,
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-08'),
        totalPhp: D(132),
        lineCount: 1,
      },
    });
    await prisma.remittanceLine.create({
      data: {
        orderId: order.id,
        shopId: shop.id,
        washValuePhp: D(150),
        commissionPhp: D(18),
        payoutPhp: D(132),
        batchId: batch.id,
      },
    });
    await prisma.notification.create({
      data: { userId: owner.id, type: 'ORDER_UPDATE', title: 't', body: 'b' },
    });

    await svc.remove(uid);

    expect(await prisma.user.findUnique({ where: { firebaseUid: uid } })).toBeNull();
    expect(await prisma.shop.findUnique({ where: { id: shop.id } })).toBeNull();
    expect(await prisma.shopService.count({ where: { shopId: shop.id } })).toBe(0);
    expect(await prisma.shopMember.count({ where: { shopId: shop.id } })).toBe(0);
    expect(await prisma.shopInvite.count({ where: { invitedByUserId: owner.id } })).toBe(0);
    expect(await prisma.order.count({ where: { id: order.id } })).toBe(0);
    expect(await prisma.orderEvent.count({ where: { orderId: order.id } })).toBe(0);
    expect(await prisma.rating.count({ where: { orderId: order.id } })).toBe(0);
    expect(await prisma.remittanceLine.count({ where: { orderId: order.id } })).toBe(0);
    expect(await prisma.remittanceBatch.count({ where: { id: batch.id } })).toBe(0);
    expect(await prisma.notification.count({ where: { userId: owner.id } })).toBe(0);
    // The shared shop (another owner) survives without the deleted owner.
    expect(await prisma.shopMember.findMany({ where: { shopId: shared.id } })).toEqual([
      expect.objectContaining({ userId: other.id, role: 'OWNER' }),
    ]);
    // Other users survive.
    expect(await prisma.user.count({ where: { id: { in: [staff.id, other.id] } } })).toBe(2);
  });

  it('DELETE of an unknown uid is a no-op (idempotent cleanup)', async () => {
    await expect(svc.remove(`never-${SUFFIX}`)).resolves.toBeUndefined();
  });
});
