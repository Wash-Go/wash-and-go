import { ConflictException } from '@nestjs/common';
import { OrderStatus, Prisma, ServiceType, User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { ZonesService } from '../zones/zones.service';
import { ZonesRepository } from '../zones/zones.repository';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

/*
 * ADR-003 acceptance evidence + money-path concurrency proof. Runs against the
 * real Docker/CI Postgres — advisory locks and SELECT FOR UPDATE cannot be
 * mocked. Verifies:
 *   1. one full express lifecycle end to end (BOOKED → DELIVERED + remittance)
 *   2. capacity race: two concurrent creates on a 1-slot shop → exactly one wins
 *   3. transition race: two concurrent DELIVERED → exactly one wins, one line
 */

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);
const SUFFIX = `${Date.now()}`;

// Central Zamboanga — inside the coverage polygon.
const PICKUP = { pickupLat: 6.9111, pickupLng: 122.0794 };

describe('Orders integration (Docker Postgres)', () => {
  const prisma = new PrismaService();
  const repo = new OrdersRepository(prisma);
  // Real config service against the same Postgres — seeds the singleton from
  // defaults (serviceFee ₱7, delivery base ₱40 / free 2km / ₱8·km / cap ₱150 /
  // road 1.3, maxResolve 20km), so the golden totals below hold.
  const config = new PlatformConfigService(prisma, new ConfigService());
  // Real zones against the same Postgres — empty table falls back to the pilot
  // ring, so the central-ZC PICKUP is covered.
  const zones = new ZonesService(new ZonesRepository(prisma));
  const service = new OrdersService(prisma, repo, config, zones);

  const createdShopIds: string[] = [];
  let customer: User;
  let rider: User;
  let admin: User;
  let serviceItemId: string;

  beforeAll(async () => {
    await prisma.$connect();

    // A prior run may have persisted the old default; pin the Express ceiling to
    // 6kg so the golden Medium (6kg) order is eligible regardless of DB state.
    await config.update({ expressWeightThresholdKg: 6 }, `int-${SUFFIX}`);

    const wdf = await prisma.serviceCatalogItem.upsert({
      where: { code: 'WDF' },
      create: { code: 'WDF', name: 'Wash, Dry & Fold', billingUnit: 'PER_KG' },
      update: {},
    });
    serviceItemId = wdf.id;

    customer = await prisma.user.create({
      data: {
        firebaseUid: `int-customer-${SUFFIX}`,
        phone: `+639${SUFFIX.slice(-9)}`,
        displayName: 'Int Customer',
        roles: ['CUSTOMER'],
      },
    });
    rider = await prisma.user.create({
      data: {
        firebaseUid: `int-rider-${SUFFIX}`,
        phone: `+638${SUFFIX.slice(-9)}`,
        displayName: 'Int Rider',
        roles: ['RIDER'],
      },
    });
    admin = await prisma.user.create({
      data: {
        firebaseUid: `int-admin-${SUFFIX}`,
        phone: `+637${SUFFIX.slice(-9)}`,
        displayName: 'Int Admin',
        roles: ['ADMIN'],
      },
    });
  });

  afterAll(async () => {
    // Tear down in FK dependency order for every shop this suite created.
    for (const shopId of createdShopIds) {
      const orders = await prisma.order.findMany({ where: { shopId } });
      const ids = orders.map((o) => o.id);
      await prisma.remittanceLine.deleteMany({ where: { orderId: { in: ids } } });
      await prisma.orderEvent.deleteMany({ where: { orderId: { in: ids } } });
      await prisma.order.deleteMany({ where: { shopId } });
      await prisma.shopService.deleteMany({ where: { shopId } });
      await prisma.shop.delete({ where: { id: shopId } });
    }
    await prisma.user.deleteMany({
      where: { id: { in: [customer.id, rider.id, admin.id] } },
    });
    await prisma.$disconnect();
  });

  async function makeShop(expressSlotsPerDay: number): Promise<{
    shopId: string;
    shopServiceId: string;
  }> {
    const shop = await prisma.shop.create({
      data: {
        name: `Int Shop ${SUFFIX}-${expressSlotsPerDay}`,
        address: 'Tetuan, Zamboanga City',
        lat: D('6.9111'),
        lng: D('122.0794'),
        commissionPct: D('12.00'),
        expressSlotsPerDay,
      },
    });
    createdShopIds.push(shop.id);
    const ss = await prisma.shopService.create({
      data: {
        shopId: shop.id,
        serviceId: serviceItemId,
        ratePhp: D('25.00'),
        turnaroundHours: 24,
      },
    });
    return { shopId: shop.id, shopServiceId: ss.id };
  }

  function book(shopServiceId: string, loadCategory: 'S' | 'M' | 'L' = 'M') {
    return service.createExpressOrder(customer, {
      shopServiceId,
      pickupAddress: 'Tetuan',
      ...PICKUP,
      loadCategory, // 'M' → 6kg estimate → golden ₱197 order
    });
  }

  function bookScheduled(shopServiceId: string) {
    return service.createScheduledOrder(customer, {
      shopServiceId,
      pickupAddress: 'Tetuan',
      ...PICKUP,
      loadCategory: 'L', // 9kg — Scheduled has no weight ceiling
      serviceType: 'SCHEDULED',
      scheduledPickupAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    });
  }

  it('books a Scheduled (Tier 1) order — any size, with a pickup time', async () => {
    const { shopServiceId } = await makeShop(0); // scheduled ignores express slots
    const order = await bookScheduled(shopServiceId);
    expect(order.serviceType).toBe(ServiceType.SCHEDULED);
    expect(order.status).toBe(OrderStatus.BOOKED);
    expect(order.scheduledPickupAt).toBeInstanceOf(Date);
    // 9kg × ₱25 = ₱225 wash + ₱40 delivery + ₱7 service = ₱272 (no ceiling)
    expect(order.customerTotalPhp.toFixed(2)).toBe('272.00');
  });

  it('auto-dispatches the booking to a rider when the toggle is on', async () => {
    const { shopServiceId } = await makeShop(5);
    await config.update({ autoDispatchEnabled: 1 }, `int-${SUFFIX}`);
    try {
      const order = await book(shopServiceId);
      expect(order.status).toBe(OrderStatus.ASSIGNED);
      expect(order.assignedRiderId).not.toBeNull();
      // driveable by the auto-assigned rider
      const assigned = await prisma.user.findUniqueOrThrow({
        where: { id: order.assignedRiderId! },
      });
      const moved = await service.transition(assigned, order.id, {
        status: OrderStatus.PICKED_UP,
      });
      expect(moved.status).toBe(OrderStatus.PICKED_UP);
    } finally {
      await config.update({ autoDispatchEnabled: 0 }, `int-${SUFFIX}`);
    }
  });

  it('is idempotent — a repeated idempotency key returns the same order', async () => {
    const { shopServiceId } = await makeShop(5);
    const key = `idem-${SUFFIX}`;
    const body = {
      shopServiceId,
      pickupAddress: 'Tetuan',
      ...PICKUP,
      loadCategory: 'M' as const,
    };
    const first = await service.createExpressOrder(customer, body, key);
    const second = await service.createExpressOrder(customer, body, key);
    expect(second.id).toBe(first.id);
    const count = await prisma.order.count({ where: { idempotencyKey: key } });
    expect(count).toBe(1);
  });

  it('paginates the order list — limit caps the page, cursor returns the next', async () => {
    const { shopServiceId } = await makeShop(5);
    await book(shopServiceId);
    await book(shopServiceId);
    await book(shopServiceId); // customer now has >= 3 orders

    const page1 = await service.listOrders(customer, { limit: 2 });
    expect(page1).toHaveLength(2);

    const cursor = page1[1].id;
    const page2 = await service.listOrders(customer, { limit: 2, before: cursor });
    const page1Ids = new Set(page1.map((o) => o.id));
    // No overlap, and the next page is older than the cursor row.
    for (const o of page2) {
      expect(page1Ids.has(o.id)).toBe(false);
      expect(o.createdAt.getTime()).toBeLessThanOrEqual(
        page1[1].createdAt.getTime(),
      );
    }
  });

  it('runs a full express lifecycle and writes remittance on DELIVERED', async () => {
    const { shopServiceId } = await makeShop(5);
    const order = await book(shopServiceId);
    expect(order.status).toBe(OrderStatus.BOOKED);
    expect(order.code).toMatch(/^WG-\d{4}-\d{6}$/);
    // pickup == shop coords → 0 km → delivery = base ₱40; total 150 + 40 + 7
    expect(order.customerTotalPhp.toFixed(2)).toBe('197.00');

    await service.assignRider(admin, order.id, { riderId: rider.id });
    await service.transition(rider, order.id, { status: OrderStatus.PICKED_UP });
    await service.transition(rider, order.id, { status: OrderStatus.AT_SHOP });

    // shop weigh recomputes from actual 8kg (admin acts as shop here)
    await service.weigh(admin, order.id, { weightKg: 8 });
    await service.transition(admin, order.id, { status: OrderStatus.PROCESSING });
    await service.transition(admin, order.id, {
      status: OrderStatus.READY_FOR_RETURN,
    });
    await service.transition(rider, order.id, {
      status: OrderStatus.OUT_FOR_RETURN,
    });
    const delivered = await service.transition(rider, order.id, {
      status: OrderStatus.DELIVERED,
    });

    expect(delivered.status).toBe(OrderStatus.DELIVERED);
    expect(delivered.deliveredAt).not.toBeNull();
    // reweighed 8kg × ₱25 = ₱200 wash, 12% = ₱24 commission, ₱176 remittance
    expect(delivered.washValuePhp.toFixed(2)).toBe('200.00');
    expect(delivered.shopRemittancePhp.toFixed(2)).toBe('176.00');

    const line = await prisma.remittanceLine.findUnique({
      where: { orderId: order.id },
    });
    expect(line).not.toBeNull();
    expect(line!.payoutPhp.toFixed(2)).toBe('176.00');
    expect(line!.commissionPhp.toFixed(2)).toBe('24.00');

    const events = await prisma.orderEvent.count({
      where: { orderId: order.id },
    });
    expect(events).toBe(9); // booking + 7 transitions + weigh
  });

  it('capacity: two concurrent creates on a 1-slot shop → exactly one wins', async () => {
    const { shopServiceId } = await makeShop(1);
    const results = await Promise.allSettled([
      book(shopServiceId),
      book(shopServiceId),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConflictException,
    );
  });

  it('transition: two concurrent DELIVERED → exactly one wins, one remittance line', async () => {
    const { shopServiceId } = await makeShop(5);
    const order = await book(shopServiceId);
    await service.assignRider(admin, order.id, { riderId: rider.id });
    await service.transition(rider, order.id, { status: OrderStatus.PICKED_UP });
    await service.transition(rider, order.id, { status: OrderStatus.AT_SHOP });
    await service.transition(admin, order.id, { status: OrderStatus.PROCESSING });
    await service.transition(admin, order.id, {
      status: OrderStatus.READY_FOR_RETURN,
    });
    await service.transition(rider, order.id, {
      status: OrderStatus.OUT_FOR_RETURN,
    });

    const results = await Promise.allSettled([
      service.transition(rider, order.id, { status: OrderStatus.DELIVERED }),
      service.transition(rider, order.id, { status: OrderStatus.DELIVERED }),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    expect(ok).toHaveLength(1);

    const lines = await prisma.remittanceLine.count({
      where: { orderId: order.id },
    });
    expect(lines).toBe(1);
  });
});
