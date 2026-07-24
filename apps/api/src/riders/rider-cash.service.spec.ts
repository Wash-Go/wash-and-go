import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RiderCashService } from './rider-cash.service';
import type { RiderCashRepository } from './rider-cash.repository';

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

describe('RiderCashService', () => {
  let repo: jest.Mocked<RiderCashRepository>;
  let service: RiderCashService;

  beforeEach(() => {
    repo = {
      sumCollected: jest.fn(),
      sumDeposited: jest.fn(),
      collectedByRider: jest.fn(),
      depositedByRider: jest.fn(),
      createDeposit: jest.fn(),
      findDepositByIdempotencyKey: jest.fn().mockResolvedValue(null),
      listDeposits: jest.fn(),
      findRider: jest.fn(),
    } as unknown as jest.Mocked<RiderCashRepository>;
    service = new RiderCashService(repo);
  });

  describe('balance', () => {
    it('computes outstanding = collected − deposited', async () => {
      repo.sumCollected.mockResolvedValue(D('1250.50'));
      repo.sumDeposited.mockResolvedValue(D('800.00'));
      expect(await service.balance('r1')).toEqual({
        riderId: 'r1',
        collectedPhp: '1250.50',
        depositedPhp: '800.00',
        outstandingPhp: '450.50',
      });
    });

    it('is zero across the board for a rider who collected nothing', async () => {
      repo.sumCollected.mockResolvedValue(D('0'));
      repo.sumDeposited.mockResolvedValue(D('0'));
      const b = await service.balance('r1');
      expect(b.outstandingPhp).toBe('0.00');
    });

    it('can go negative if a rider over-deposited', async () => {
      repo.sumCollected.mockResolvedValue(D('100'));
      repo.sumDeposited.mockResolvedValue(D('150'));
      expect((await service.balance('r1')).outstandingPhp).toBe('-50.00');
    });
  });

  describe('summary', () => {
    it('joins collected + deposited per rider, sorts by outstanding desc', async () => {
      repo.collectedByRider.mockResolvedValue([
        { riderId: 'r1', total: D('500') },
        { riderId: 'r2', total: D('300') },
      ] as never);
      repo.depositedByRider.mockResolvedValue([
        { riderId: 'r1', total: D('100') }, // r1 owes 400
      ] as never);

      const rows = await service.summary();
      expect(rows.map((r) => r.riderId)).toEqual(['r1', 'r2']); // 400 > 300
      expect(rows[0].outstandingPhp).toBe('400.00');
      expect(rows[1].outstandingPhp).toBe('300.00'); // no deposits → owes all
    });
  });

  describe('recordDeposit', () => {
    it('rejects a non-positive amount', async () => {
      await expect(
        service.recordDeposit('r1', 0, 'admin1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.recordDeposit('r1', -5, 'admin1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('404s a missing rider', async () => {
      repo.findRider.mockResolvedValue(null as never);
      await expect(
        service.recordDeposit('nope', 100, 'admin1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a user who is not a rider', async () => {
      repo.findRider.mockResolvedValue({ id: 'u1', roles: ['CUSTOMER'] } as never);
      await expect(
        service.recordDeposit('u1', 100, 'admin1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('records a valid deposit', async () => {
      repo.findRider.mockResolvedValue({ id: 'r1', roles: ['RIDER'] } as never);
      repo.createDeposit.mockResolvedValue({ id: 'd1' } as never);
      await service.recordDeposit('r1', 800, 'admin1', 'GCASH-9', 'end of day');
      expect(repo.createDeposit).toHaveBeenCalledWith(
        expect.objectContaining({
          riderId: 'r1',
          reference: 'GCASH-9',
          note: 'end of day',
          recordedByUid: 'admin1',
        }),
      );
      const arg = repo.createDeposit.mock.calls[0][0];
      expect(new Prisma.Decimal(String(arg.amountPhp)).toFixed(2)).toBe('800.00');
    });

    it('is idempotent — a repeated key returns the existing deposit, no double-count', async () => {
      repo.findDepositByIdempotencyKey.mockResolvedValue({ id: 'd1' } as never);
      const out = await service.recordDeposit('r1', 800, 'admin1', undefined, undefined, 'idem-1');
      expect(out).toEqual({ id: 'd1' });
      expect(repo.createDeposit).not.toHaveBeenCalled(); // no second row
      expect(repo.findRider).not.toHaveBeenCalled();
    });

    it('passes the idempotency key through to the created deposit', async () => {
      repo.findRider.mockResolvedValue({ id: 'r1', roles: ['RIDER'] } as never);
      repo.createDeposit.mockResolvedValue({ id: 'd2' } as never);
      await service.recordDeposit('r1', 500, 'admin1', undefined, undefined, 'idem-2');
      expect(repo.createDeposit).toHaveBeenCalledWith(
        expect.objectContaining({ idempotencyKey: 'idem-2' }),
      );
    });

    it('returns the winner if it loses a concurrent race on the same key', async () => {
      repo.findRider.mockResolvedValue({ id: 'r1', roles: ['RIDER'] } as never);
      repo.findDepositByIdempotencyKey
        .mockResolvedValueOnce(null) // pre-check: not seen yet
        .mockResolvedValueOnce({ id: 'winner' } as never); // after the race
      repo.createDeposit.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'x',
          meta: { target: 'RiderCashDeposit_idempotencyKey_key' },
        }),
      );
      const out = await service.recordDeposit('r1', 500, 'admin1', undefined, undefined, 'idem-3');
      expect(out).toEqual({ id: 'winner' });
    });
  });
});
