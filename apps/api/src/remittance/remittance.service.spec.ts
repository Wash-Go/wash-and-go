import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RemittanceService } from './remittance.service';
import type { RemittanceRepository } from './remittance.repository';
import type { PrismaService } from '../prisma/prisma.service';

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

const line = (id: string, payout: string, shopId = 'shop1') => ({
  id,
  orderId: `o-${id}`,
  shopId,
  washValuePhp: D('100'),
  commissionPhp: D('12'),
  payoutPhp: D(payout),
  batchId: null,
  createdAt: new Date('2026-07-15T00:00:00Z'),
});

const period = {
  periodStart: new Date('2026-07-13T00:00:00Z'),
  periodEnd: new Date('2026-07-20T00:00:00Z'),
};

describe('RemittanceService', () => {
  let repo: jest.Mocked<RemittanceRepository>;
  let prisma: PrismaService;
  let service: RemittanceService;

  beforeEach(() => {
    repo = {
      findUnbatchedLines: jest.fn(),
      distinctUnbatchedShops: jest.fn(),
      createBatch: jest.fn(),
      assignLinesToBatch: jest.fn().mockResolvedValue({ count: 0 }),
      findBatchById: jest.fn(),
      markBatchPaid: jest.fn(),
      listBatches: jest.fn(),
      shopIdsForMember: jest.fn(),
    } as unknown as jest.Mocked<RemittanceRepository>;

    prisma = {
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb({})),
    } as unknown as PrismaService;

    service = new RemittanceService(prisma, repo);
  });

  describe('listBatchesForMember', () => {
    it('returns nothing when the user is a member of no shop', async () => {
      repo.shopIdsForMember.mockResolvedValue([]);
      expect(await service.listBatchesForMember('u1')).toEqual([]);
      expect(repo.listBatches).not.toHaveBeenCalled();
    });

    it("scopes the query to the member's shops", async () => {
      repo.shopIdsForMember.mockResolvedValue(['shopA', 'shopB']);
      repo.listBatches.mockResolvedValue([{ id: 'b1' }] as never);
      const out = await service.listBatchesForMember('u1');
      expect(repo.listBatches).toHaveBeenCalledWith({
        shopId: { in: ['shopA', 'shopB'] },
      });
      expect(out).toEqual([{ id: 'b1' }]);
    });
  });

  describe('closeBatch', () => {
    it('sums payouts, creates the batch, and links every line', async () => {
      repo.findUnbatchedLines.mockResolvedValue([
        line('a', '88'),
        line('b', '44'),
        line('c', '13.50'),
      ] as never);
      repo.createBatch.mockImplementation((_tx, data) =>
        Promise.resolve({ id: 'batch1', ...data } as never),
      );

      const batch = await service.closeBatch('shop1', period);

      expect(repo.createBatch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ shopId: 'shop1', lineCount: 3 }),
      );
      // 88 + 44 + 13.50 = 145.50
      const created = repo.createBatch.mock.calls[0][1];
      expect(new Prisma.Decimal(String(created.totalPhp)).toFixed(2)).toBe('145.50');
      expect(repo.assignLinesToBatch).toHaveBeenCalledWith(
        expect.anything(),
        ['a', 'b', 'c'],
        'batch1',
      );
      expect(batch?.id).toBe('batch1');
    });

    it('returns null and writes nothing when there are no unbatched lines', async () => {
      repo.findUnbatchedLines.mockResolvedValue([] as never);
      const batch = await service.closeBatch('shop1', period);
      expect(batch).toBeNull();
      expect(repo.createBatch).not.toHaveBeenCalled();
      expect(repo.assignLinesToBatch).not.toHaveBeenCalled();
    });

    it('rejects a period whose end is not after its start', async () => {
      await expect(
        service.closeBatch('shop1', {
          periodStart: new Date('2026-07-20T00:00:00Z'),
          periodEnd: new Date('2026-07-20T00:00:00Z'),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.findUnbatchedLines).not.toHaveBeenCalled();
    });
  });

  describe('closeAllShops', () => {
    it('creates one batch per shop that has unbatched lines', async () => {
      repo.distinctUnbatchedShops.mockResolvedValue(['shop1', 'shop2'] as never);
      repo.findUnbatchedLines.mockImplementation((_tx, shopId) =>
        Promise.resolve(
          shopId === 'shop1'
            ? ([line('a', '50', 'shop1')] as never)
            : ([line('b', '70', 'shop2'), line('c', '30', 'shop2')] as never),
        ),
      );
      repo.createBatch.mockImplementation((_tx, data) =>
        Promise.resolve({ id: `batch-${data.shopId}`, ...data } as never),
      );

      const batches = await service.closeAllShops(period);

      expect(batches).toHaveLength(2);
      expect(repo.createBatch).toHaveBeenCalledTimes(2);
      const shop2 = repo.createBatch.mock.calls.find((c) => c[1].shopId === 'shop2')![1];
      expect(new Prisma.Decimal(String(shop2.totalPhp)).toFixed(2)).toBe('100.00');
      expect(shop2.lineCount).toBe(2);
    });
  });

  describe('markPaid', () => {
    it('sets PAID + reference on a pending batch', async () => {
      repo.findBatchById.mockResolvedValue({ id: 'b1', status: 'PENDING' } as never);
      repo.markBatchPaid.mockResolvedValue({ id: 'b1', status: 'PAID' } as never);

      const out = await service.markPaid('b1', 'GCASH-REF-9', 'admin1');

      expect(repo.markBatchPaid).toHaveBeenCalledWith('b1', {
        reference: 'GCASH-REF-9',
        paidByUid: 'admin1',
      });
      expect(out.status).toBe('PAID');
    });

    it('is idempotent — an already-paid batch is returned without a second write', async () => {
      const paid = { id: 'b1', status: 'PAID', reference: 'OLD' };
      repo.findBatchById.mockResolvedValue(paid as never);

      const out = await service.markPaid('b1', 'NEW-REF', 'admin1');

      expect(out).toBe(paid);
      expect(repo.markBatchPaid).not.toHaveBeenCalled();
    });

    it('404s a missing batch', async () => {
      repo.findBatchById.mockResolvedValue(null as never);
      await expect(
        service.markPaid('nope', 'ref', 'admin1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
