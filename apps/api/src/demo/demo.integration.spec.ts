import type { INestApplicationContext } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { demoConfig } from './demo-config';
import {
  DEMO_PAID_REFERENCE,
  type DemoDeps,
  bootDemo,
  localDemoUids,
  resetDemo,
  seedDemo,
} from './demo-seed';

/*
 * demo:seed / demo:reset against real Postgres (wash_and_go_test, in band).
 * Seeds the dataset through the real services, checks the per-status counts
 * and remittance totals, re-seeds (converges), resets, and proves non-demo
 * rows — including one whose address merely LOOKS like a demo address — are
 * untouched. Everything demo is purged afterwards so later suites (the
 * orders spec resolves VERIFIED shops) never see it.
 */
const SUFFIX = `${Date.now()}`;
const cfg = demoConfig({ DEMO_SHOP_NAME: `Wash & Go Demo Laundry ${SUFFIX}` });
const uids = localDemoUids(cfg);
const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

describe('demo seed + reset (Postgres)', () => {
  let app: INestApplicationContext;
  let deps: DemoDeps;
  const outsider = { userId: '', shopId: '', orderIds: [] as string[] };

  async function purge() {
    const { prisma } = deps;
    const shop = await prisma.shop.findFirst({ where: { name: cfg.shopName } });
    const users = await prisma.user.findMany({
      where: {
        firebaseUid: { in: [uids.owner, uids.staff, uids.admin, uids.rider, ...uids.customers] },
      },
    });
    const ids = users.map((u) => u.id);
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { shopId: shop?.id ?? '__none__' },
          { customerId: { in: ids } },
          { assignedRiderId: { in: ids } },
        ],
      },
      select: { id: true },
    });
    const oids = orders.map((o) => o.id);
    await prisma.orderEvent.deleteMany({ where: { orderId: { in: oids } } });
    await prisma.rating.deleteMany({ where: { orderId: { in: oids } } });
    await prisma.remittanceLine.deleteMany({ where: { orderId: { in: oids } } });
    await prisma.order.deleteMany({ where: { id: { in: oids } } });
    if (shop) {
      await prisma.remittanceBatch.deleteMany({ where: { shopId: shop.id } });
      await prisma.shopService.deleteMany({ where: { shopId: shop.id } });
      await prisma.shopMember.deleteMany({ where: { shopId: shop.id } });
      await prisma.shopInvite.deleteMany({ where: { shopId: shop.id } });
      await prisma.shop.delete({ where: { id: shop.id } });
    }
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.riderCashDeposit.deleteMany({ where: { riderId: { in: ids } } });
    await prisma.riderProfile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.shopMember.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }

  async function statusCounts() {
    const shop = await deps.prisma.shop.findFirstOrThrow({ where: { name: cfg.shopName } });
    const rows = await deps.prisma.order.groupBy({
      by: ['status'],
      where: { shopId: shop.id },
      _count: { _all: true },
    });
    return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
  }

  beforeAll(async () => {
    ({ app, deps } = await bootDemo());
    await purge();
    // A non-demo customer + shop + two orders that must survive everything.
    const { prisma } = deps;
    const u = await prisma.user.create({
      data: {
        firebaseUid: `outsider-${SUFFIX}`,
        phone: `pending:outsider-${SUFFIX}`,
        displayName: 'Real Customer',
        roles: ['CUSTOMER'],
      },
    });
    const s = await prisma.shop.create({
      data: { name: `Real Shop ${SUFFIX}`, address: 'x', lat: D(6.9), lng: D(122.07) },
    });
    outsider.userId = u.id;
    outsider.shopId = s.id;
    for (const [i, addr] of ['12 Real St, Tetuan', 'Demo 9 Lookalike St'].entries()) {
      const o = await prisma.order.create({
        data: {
          code: `WG-REAL-${SUFFIX}-${i}`,
          customerId: u.id,
          shopId: s.id,
          serviceType: 'EXPRESS',
          status: 'BOOKED',
          pickupAddress: addr,
        },
      });
      await prisma.orderEvent.create({
        data: { orderId: o.id, status: 'BOOKED', actorUserId: u.id },
      });
      outsider.orderIds.push(o.id);
    }
  }, 60_000);

  afterAll(async () => {
    await purge();
    await deps.prisma.orderEvent.deleteMany({ where: { orderId: { in: outsider.orderIds } } });
    await deps.prisma.order.deleteMany({ where: { id: { in: outsider.orderIds } } });
    await deps.prisma.shop.deleteMany({ where: { id: outsider.shopId } });
    await deps.prisma.user.deleteMany({ where: { id: outsider.userId } });
    await app.close();
  });

  const EXPECTED = {
    ASSIGNED: 1,
    PICKED_UP: 1,
    AT_SHOP: 2,
    PROCESSING: 2,
    READY_FOR_RETURN: 1,
    DELIVERED: 6,
    CANCELLED: 1,
  };

  it('seeds 14 orders with the briefed status mix, through the real services', async () => {
    const summary = await seedDemo(deps, cfg, uids);
    expect(summary.orders).toHaveLength(14);
    expect(await statusCounts()).toEqual(EXPECTED);

    const { prisma } = deps;
    const shopId = summary.shopId;
    // Real service output: every order has its BOOKED event and a priced total.
    const orders = await prisma.order.findMany({ where: { shopId }, include: { events: true } });
    expect(orders.every((o) => o.events.some((e) => e.status === 'BOOKED'))).toBe(true);
    expect(orders.every((o) => Number(o.customerTotalPhp) > 0)).toBe(true);
    expect(orders.every((o) => o.pickupAddress.startsWith('Demo '))).toBe(true);
    // Weighed orders carry their weight; delivered ones a line + cash stamp.
    const delivered = orders.filter((o) => o.status === 'DELIVERED');
    expect(
      delivered.every((o) => o.weightKg != null && o.paidCashAt != null && o.deliveredAt != null),
    ).toBe(true);
    expect(await prisma.rating.count({ where: { shopId, stars: 5 } })).toBe(1);
    // Timeline spread over the last 3 days.
    const oldest = Math.min(...orders.map((o) => o.createdAt.getTime()));
    expect(Date.now() - oldest).toBeGreaterThan(60 * 3_600_000);
    expect(Date.now() - oldest).toBeLessThanOrEqual(72 * 3_600_000 + 60_000);
  });

  it('payouts: one PAID batch (GCASH-DEMO-0001), one PENDING, the two newest delivered unbatched', async () => {
    const { prisma } = deps;
    const shop = await prisma.shop.findFirstOrThrow({ where: { name: cfg.shopName } });
    const batches = await prisma.remittanceBatch.findMany({
      where: { shopId: shop.id },
      include: { lines: true },
    });
    const paid = batches.find((b) => b.status === 'PAID')!;
    const pending = batches.find((b) => b.status === 'PENDING')!;
    expect(batches).toHaveLength(2);
    expect(paid).toMatchObject({ reference: DEMO_PAID_REFERENCE, lineCount: 2 });
    expect(pending.lineCount).toBe(2);
    // Batch totals are the sum of their lines' payouts.
    for (const b of [paid, pending]) {
      const sum = b.lines.reduce((a, l) => a.add(l.payoutPhp), D(0));
      expect(b.totalPhp.toFixed(2)).toBe(sum.toFixed(2));
    }
    // Unbatched = the two newest deliveries; their payouts are the pending card total.
    const delivered = await prisma.order.findMany({
      where: { shopId: shop.id, status: 'DELIVERED' },
      orderBy: { deliveredAt: 'desc' },
      take: 2,
    });
    const unbatched = await prisma.remittanceLine.findMany({
      where: { shopId: shop.id, batchId: null },
    });
    expect(unbatched.map((l) => l.orderId).sort()).toEqual(delivered.map((o) => o.id).sort());
    const expected = delivered.reduce((a, o) => a.add(o.shopRemittancePhp), D(0));
    const got = unbatched.reduce((a, l) => a.add(l.payoutPhp), D(0));
    expect(got.toFixed(2)).toBe(expected.toFixed(2));
  });

  it('the demo rider has no outstanding cash after the seed (can be assigned live)', async () => {
    const rider = await deps.prisma.user.findUniqueOrThrow({ where: { firebaseUid: uids.rider } });
    expect((await deps.riderCash.balance(rider.id)).outstandingPhp).toBe('0.00');
  });

  it('re-seeding converges to the same state (no duplicates)', async () => {
    await seedDemo(deps, cfg, uids);
    expect(await statusCounts()).toEqual(EXPECTED);
    const shop = await deps.prisma.shop.findFirstOrThrow({ where: { name: cfg.shopName } });
    expect(await deps.prisma.remittanceBatch.count({ where: { shopId: shop.id } })).toBe(2);
    expect(await deps.prisma.shopService.count({ where: { shopId: shop.id } })).toBe(3);
    expect(await deps.prisma.shopMember.count({ where: { shopId: shop.id } })).toBe(2);
  });

  it('reset clears and re-seeds; non-demo orders (even a lookalike address) survive with their events', async () => {
    const { before, after } = await resetDemo(deps, cfg, uids);
    expect(before.orders).toBe(14);
    expect(after.orders).toBe(14);
    expect(await statusCounts()).toEqual(EXPECTED);
    const survivors = await deps.prisma.order.findMany({
      where: { id: { in: outsider.orderIds } },
      include: { events: true },
    });
    expect(survivors).toHaveLength(2);
    expect(survivors.every((o) => o.events.length === 1)).toBe(true);
  });
});
