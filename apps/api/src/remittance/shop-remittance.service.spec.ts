import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ShopAccessService } from '../shops/shop-access.service';
import { fakeShopPrisma } from '../shops/testing/shop-prisma.fake';
import type { RemittanceRepository } from './remittance.repository';
import { ShopRemittanceService } from './shop-remittance.service';

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

const batch = (id: string, shopId: string, over: Record<string, unknown> = {}) => ({
  id,
  shopId,
  periodStart: new Date('2026-10-05T00:00:00Z'),
  periodEnd: new Date('2026-10-12T00:00:00Z'),
  totalPhp: D('264.00'),
  lineCount: 2,
  status: 'PAID',
  reference: 'GC-123',
  paidAt: new Date('2026-10-13T00:00:00Z'),
  paidByUid: 'fb-admin-secret',
  createdAt: new Date('2026-10-12T01:00:00Z'),
  ...over,
});

const line = (id: string, createdAt: string, over: Record<string, unknown> = {}) => ({
  id,
  orderId: `o-${id}`,
  shopId: 'sA',
  washValuePhp: D('150.00'),
  commissionPhp: D('18.00'),
  payoutPhp: D('132.00'),
  batchId: 'bA',
  createdAt: new Date(createdAt),
  order: { code: `WG-2026-${id}`, deliveredAt: new Date('2026-10-06T10:00:00Z') },
  ...over,
});

function setup() {
  // Shop membership comes from the shared ShopAccessService over the fake.
  const fake = fakeShopPrisma({
    shop: [{ id: 'sA', name: 'Suds A' }, { id: 'sB', name: 'Suds B' }],
    shopMember: [
      { id: 'mA', shopId: 'sA', userId: 'uA', role: 'OWNER' },
      { id: 'mS', shopId: 'sA', userId: 'uS', role: 'STAFF' },
      { id: 'mB', shopId: 'sB', userId: 'uB', role: 'OWNER' },
    ],
  });
  const repo = {
    pendingForShop: jest.fn(),
    findBatchWithLines: jest.fn(),
    listBatches: jest.fn(),
    shopNames: jest.fn((ids: string[]) =>
      Promise.resolve(new Map(ids.map((i) => [i, i === 'sA' ? 'Suds A' : 'Suds B']))),
    ),
  };
  const svc = new ShopRemittanceService(
    repo as unknown as RemittanceRepository,
    new ShopAccessService(fake.prisma),
  );
  return { svc, repo };
}

describe('ShopRemittanceService', () => {
  describe('GET /shop/remittance/pending', () => {
    it('totals the caller’s unbatched lines (2dp string, count, oldest)', async () => {
      const { svc, repo } = setup();
      repo.pendingForShop.mockResolvedValue({
        total: D('396.5'),
        count: 3,
        oldest: new Date('2026-10-14T08:00:00Z'),
      });
      expect(await svc.pending('uA')).toEqual({
        totalPhp: '396.50',
        lineCount: 3,
        oldestLineAt: '2026-10-14T08:00:00.000Z',
      });
      expect(repo.pendingForShop).toHaveBeenCalledWith('sA');
    });

    it('nothing pending → zero total and null oldest', async () => {
      const { svc, repo } = setup();
      repo.pendingForShop.mockResolvedValue({ total: D(0), count: 0, oldest: null });
      expect(await svc.pending('uB')).toEqual({ totalPhp: '0.00', lineCount: 0, oldestLineAt: null });
      expect(repo.pendingForShop).toHaveBeenCalledWith('sB');
    });

    it('staff can read it (their shop)', async () => {
      const { svc, repo } = setup();
      repo.pendingForShop.mockResolvedValue({ total: D(0), count: 0, oldest: null });
      await svc.pending('uS');
      expect(repo.pendingForShop).toHaveBeenCalledWith('sA');
    });

    it('no shop → 404', async () => {
      const { svc, repo } = setup();
      await expect(svc.pending('nobody')).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.pendingForShop).not.toHaveBeenCalled();
    });
  });

  describe('GET /shop/remittance/batches/:id', () => {
    it('returns the batch (same shape as the list) plus its lines, paidByUid stripped', async () => {
      const { svc, repo } = setup();
      repo.findBatchWithLines.mockResolvedValue({
        ...batch('bA', 'sA'),
        lines: [line('000002', '2026-10-07T00:00:00Z'), line('000001', '2026-10-06T12:00:00Z', { order: { code: 'WG-2026-000001', deliveredAt: null } })],
      });
      const out = await svc.batchDetail('uA', 'bA');
      expect(out).toMatchObject({
        id: 'bA',
        shopId: 'sA',
        shopName: 'Suds A',
        totalPhp: D('264.00'),
        lineCount: 2,
        status: 'PAID',
        reference: 'GC-123',
        paidByUid: null,
      });
      expect(JSON.stringify(out)).not.toContain('fb-admin-secret');
      // Sorted by createdAt; money as 2dp strings.
      expect(out.lines).toEqual([
        {
          id: '000001',
          orderId: 'o-000001',
          orderCode: 'WG-2026-000001',
          deliveredAt: null,
          washValuePhp: '150.00',
          commissionPhp: '18.00',
          payoutPhp: '132.00',
          createdAt: '2026-10-06T12:00:00.000Z',
        },
        {
          id: '000002',
          orderId: 'o-000002',
          orderCode: 'WG-2026-000002',
          deliveredAt: '2026-10-06T10:00:00.000Z',
          washValuePhp: '150.00',
          commissionPhp: '18.00',
          payoutPhp: '132.00',
          createdAt: '2026-10-07T00:00:00.000Z',
        },
      ]);
    });

    it('the batch part serializes exactly like the shop list item', async () => {
      const { svc, repo } = setup();
      repo.findBatchWithLines.mockResolvedValue({ ...batch('bA', 'sA'), lines: [] });
      repo.listBatches.mockResolvedValue([batch('bA', 'sA')]);
      const { lines, ...detail } = await svc.batchDetail('uA', 'bA');
      const [listed] = await svc.listBatches('uA');
      expect(lines).toEqual([]);
      expect(JSON.parse(JSON.stringify(detail))).toEqual(JSON.parse(JSON.stringify(listed)));
    });

    it('staff can open their shop’s batch', async () => {
      const { svc, repo } = setup();
      repo.findBatchWithLines.mockResolvedValue({ ...batch('bA', 'sA'), lines: [] });
      await expect(svc.batchDetail('uS', 'bA')).resolves.toMatchObject({ id: 'bA' });
    });

    it('another shop’s batch → 404 (not 403), with nothing of it in the error', async () => {
      const { svc, repo } = setup();
      repo.findBatchWithLines.mockResolvedValue({ ...batch('bB', 'sB'), lines: [line('x', '2026-10-06T00:00:00Z')] });
      const err = await svc.batchDetail('uA', 'bB').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(NotFoundException);
      expect(JSON.stringify((err as NotFoundException).getResponse())).not.toMatch(/sB|Suds B|GC-123/);
    });

    it('an unknown batch id → the same 404', async () => {
      const { svc, repo } = setup();
      repo.findBatchWithLines.mockResolvedValue(null);
      const unknown = await svc.batchDetail('uA', 'nope').catch((e: unknown) => e);
      repo.findBatchWithLines.mockResolvedValue({ ...batch('bB', 'sB'), lines: [] });
      const foreign = await svc.batchDetail('uA', 'bB').catch((e: unknown) => e);
      expect((unknown as NotFoundException).getResponse()).toEqual(
        (foreign as NotFoundException).getResponse(),
      );
    });

    it('no shop → 404 without loading the batch', async () => {
      const { svc, repo } = setup();
      await expect(svc.batchDetail('nobody', 'bA')).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.findBatchWithLines).not.toHaveBeenCalled();
    });
  });

  describe('GET /shop/remittance/batches', () => {
    it('lists only the resolved shop’s batches, named, paidByUid stripped', async () => {
      const { svc, repo } = setup();
      repo.listBatches.mockResolvedValue([batch('bA', 'sA')]);
      const out = await svc.listBatches('uS');
      expect(repo.listBatches).toHaveBeenCalledWith({ shopId: 'sA' });
      expect(out).toEqual([expect.objectContaining({ id: 'bA', shopName: 'Suds A', paidByUid: null })]);
      expect(JSON.stringify(out)).not.toContain('fb-admin-secret');
    });

    it('no shop → empty list (unchanged behaviour)', async () => {
      const { svc, repo } = setup();
      expect(await svc.listBatches('nobody')).toEqual([]);
      expect(repo.listBatches).not.toHaveBeenCalled();
    });
  });
});
