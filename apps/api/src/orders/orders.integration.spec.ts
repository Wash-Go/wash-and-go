import { ConflictException } from '@nestjs/common';
import { OrderStatus, Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PricingConfig } from '../pricing/pricing.config';
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
  const pricingConfig = {
    serviceFeePhp: '7',
    delivery: {
      baseDeliveryPhp: 40,
      freeKm: 2,
      perKmPhp: 8,
      maxDeliveryPhp: 150,
      roadFactor: 1.3,
    },
  } as unknown as PricingConfig;
  const service = new OrdersService(prisma, repo, pricingConfig);

  const createdShopIds: string[] = [];
  let customer: User;
  let rider: User;
  let admin: User;
  let serviceItemId: string;

  beforeAll(async () => {
    await prisma.$connect();

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

  function book(shopServiceId: string, weightEstimateKg = 6) {
    return service.createExpressOrder(customer, {
      shopServiceId,
      pickupAddress: 'Tetuan',
      ...PICKUP,
      weightEstimateKg,
    });
  }

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
