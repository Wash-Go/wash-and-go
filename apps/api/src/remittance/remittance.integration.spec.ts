import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RemittanceRepository } from './remittance.repository';
import { RemittanceService } from './remittance.service';

/*
 * Money-path DB proof (real Docker/CI Postgres). Seeds a customer + one order +
 * payout lines, then exercises the real closeBatch grouping/sum/link and the
 * mark-paid + no-double-batch behavior against the database — updateMany guards
 * and the Decimal sum can't be proven with mocks.
 */
const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);
const SUFFIX = `${Date.now()}`;
const SHOP = `rem-shop-${SUFFIX}`;
const PERIOD = {
  periodStart: new Date('2026-06-01T00:00:00Z'),
  periodEnd: new Date('2026-06-08T00:00:00Z'),
};
const inPeriod = new Date('2026-06-03T00:00:00Z');

describe('Remittance integration (Docker Postgres)', () => {
  const prisma = new PrismaService();
  const service = new RemittanceService(prisma, new RemittanceRepository(prisma));

  let customerId: string;
  const orderIds: string[] = [];
  const batchIds: string[] = [];

  beforeAll(async () => {
    await prisma.$connect();
    const customer = await prisma.user.create({
      data: {
        firebaseUid: `rem-cust-${SUFFIX}`,
        phone: `+63917${SUFFIX.slice(-7)}`,
        displayName: 'Remit Test',
        roles: ['CUSTOMER'],
      },
    });
    customerId = customer.id;

    // Two delivered-order payout lines for the shop, both inside the period.
    const seeds = [
      { i: 0, payout: '88.00' },
      { i: 1, payout: '57.50' },
    ];
    for (const { i, payout } of seeds) {
      const order = await prisma.order.create({
        data: {
          code: `WG-REM-${SUFFIX}-${i}`,
          customerId,
          serviceType: 'EXPRESS',
          status: 'DELIVERED',
          pickupAddress: 'Test',
        },
      });
      orderIds.push(order.id);
      await prisma.remittanceLine.create({
        data: {
          orderId: order.id,
          shopId: SHOP,
          washValuePhp: D('100'),
          commissionPhp: D('12'),
          payoutPhp: D(payout),
          createdAt: inPeriod,
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.remittanceLine.deleteMany({ where: { shopId: SHOP } });
    if (batchIds.length) {
      await prisma.remittanceBatch.deleteMany({ where: { id: { in: batchIds } } });
    }
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.user.deleteMany({ where: { id: customerId } });
    await prisma.$disconnect();
  });

  it('closes a period into one batch: summed payout, linked lines', async () => {
    const batch = await service.closeBatch(SHOP, PERIOD);
    expect(batch).not.toBeNull();
    batchIds.push(batch!.id);

    // 88.00 + 57.50 = 145.50
    expect(batch!.totalPhp.toFixed(2)).toBe('145.50');
    expect(batch!.lineCount).toBe(2);
    expect(batch!.status).toBe('PENDING');

    const lines = await prisma.remittanceLine.findMany({ where: { shopId: SHOP } });
    expect(lines.every((l) => l.batchId === batch!.id)).toBe(true);
  });

  it('does not re-batch already-batched lines (empty second close)', async () => {
    const again = await service.closeBatch(SHOP, PERIOD);
    expect(again).toBeNull();
  });

  it('marks the batch paid with the transfer reference (idempotent)', async () => {
    const id = batchIds[0];
    const paid = await service.markPaid(id, 'GCASH-TEST-1', 'admin-uid');
    expect(paid.status).toBe('PAID');
    expect(paid.reference).toBe('GCASH-TEST-1');
    expect(paid.paidAt).not.toBeNull();

    // Re-mark: idempotent, keeps the original reference.
    const again = await service.markPaid(id, 'DIFFERENT-REF', 'other-admin');
    expect(again.reference).toBe('GCASH-TEST-1');
  });
});
