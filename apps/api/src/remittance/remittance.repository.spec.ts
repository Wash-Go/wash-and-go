import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { RemittanceRepository } from './remittance.repository';

// The shop-facing reads: pin the query shape (the real sums run in Postgres).
describe('RemittanceRepository (shop reads)', () => {
  it('pendingForShop sums only the shop’s UNBATCHED lines', async () => {
    const aggregate = jest.fn().mockResolvedValue({
      _sum: { payoutPhp: new Prisma.Decimal('264.00') },
      _count: { _all: 2 },
      _min: { createdAt: new Date('2026-10-14T00:00:00Z') },
    });
    const repo = new RemittanceRepository({ remittanceLine: { aggregate } } as unknown as PrismaService);
    const out = await repo.pendingForShop('sA');
    expect(aggregate).toHaveBeenCalledWith({
      where: { shopId: 'sA', batchId: null },
      _sum: { payoutPhp: true },
      _count: { _all: true },
      _min: { createdAt: true },
    });
    expect(out).toEqual({ total: new Prisma.Decimal('264.00'), count: 2, oldest: new Date('2026-10-14T00:00:00Z') });
  });

  it('pendingForShop with no lines → 0 / 0 / null', async () => {
    const aggregate = jest.fn().mockResolvedValue({
      _sum: { payoutPhp: null },
      _count: { _all: 0 },
      _min: { createdAt: null },
    });
    const repo = new RemittanceRepository({ remittanceLine: { aggregate } } as unknown as PrismaService);
    const out = await repo.pendingForShop('sA');
    expect(out.total.toFixed(2)).toBe('0.00');
    expect(out).toMatchObject({ count: 0, oldest: null });
  });

  it('findBatchWithLines loads lines oldest-first with the order code + delivered time', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const repo = new RemittanceRepository({ remittanceBatch: { findUnique } } as unknown as PrismaService);
    await repo.findBatchWithLines('bA');
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'bA' },
      include: {
        lines: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          include: { order: { select: { code: true, deliveredAt: true } } },
        },
      },
    });
  });
});
