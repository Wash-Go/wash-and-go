import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformConfigService } from './platform-config.service';
import type { PrismaService } from '../prisma/prisma.service';

// Full singleton row as Prisma would return it (Decimals are fine as numbers in
// these tests — the service coerces via Number()).
const row = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  serviceFeePhp: 7,
  deliveryBasePhp: 40,
  deliveryFreeKm: 2,
  deliveryPerKmPhp: 8,
  deliveryMaxPhp: 150,
  deliveryRoadFactor: 1.3,
  maxResolveKm: 20,
  expressWeightThresholdKg: 5,
  minOrderPricePhp: 0,
  platformFeePhp: 0,
  updatedAt: new Date('2026-07-19T00:00:00Z'),
  toString() {
    return String((this as Record<string, unknown>).__v);
  },
  ...over,
});

// env with no overrides -> service falls back to code defaults.
const env = { get: () => undefined } as unknown as ConfigService;

function makeService(prisma: Partial<PrismaService>) {
  return new PlatformConfigService(prisma as PrismaService, env);
}

describe('PlatformConfigService', () => {
  it('seeds the singleton from defaults on first read', async () => {
    const create = jest.fn().mockResolvedValue(row());
    const prisma = {
      platformConfig: {
        findUnique: jest.fn().mockResolvedValue(null),
        create,
      },
    } as unknown as PrismaService;

    const dto = await makeService(prisma).getRaw();

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: 1, serviceFeePhp: 7, maxResolveKm: 20 }),
    });
    expect(dto.serviceFeePhp).toBe(7);
    expect(dto.deliveryRoadFactor).toBe(1.3);
  });

  it('exposes the grouped values the pricing engine consumes', async () => {
    const prisma = {
      platformConfig: {
        findUnique: jest.fn().mockResolvedValue(row()),
      },
    } as unknown as PrismaService;

    const v = await makeService(prisma).getValues();

    expect(v.delivery).toEqual({
      baseDeliveryPhp: 40,
      freeKm: 2,
      perKmPhp: 8,
      maxDeliveryPhp: 150,
      roadFactor: 1.3,
    });
    expect(v.serviceFeePhp).toBe('7');
    expect(v.maxResolveKm).toBe(20);
  });

  it('rejects a negative or non-finite value', async () => {
    const prisma = {
      platformConfig: { findUnique: jest.fn().mockResolvedValue(row()) },
    } as unknown as PrismaService;
    const svc = makeService(prisma);

    await expect(svc.update({ deliveryPerKmPhp: -1 }, 'dev-admin')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      svc.update({ serviceFeePhp: Number.POSITIVE_INFINITY }, 'dev-admin'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an unknown field', async () => {
    const prisma = {
      platformConfig: { findUnique: jest.fn().mockResolvedValue(row()) },
    } as unknown as PrismaService;

    await expect(
      makeService(prisma).update({ bogus: 5 } as never, 'dev-admin'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('writes only changed fields and audits each change in one transaction', async () => {
    const update = jest.fn().mockResolvedValue(row({ deliveryPerKmPhp: 9 }));
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = {
      platformConfig: { update },
      configAudit: { createMany },
    };
    const prisma = {
      platformConfig: { findUnique: jest.fn().mockResolvedValue(row()) },
      $transaction: jest.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
    } as unknown as PrismaService;

    // perKm changes 8 -> 9; serviceFee unchanged at 7 (must be skipped).
    await makeService(prisma).update(
      { deliveryPerKmPhp: 9, serviceFeePhp: 7 },
      'dev-admin',
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { deliveryPerKmPhp: 9 },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          actorUid: 'dev-admin',
          field: 'deliveryPerKmPhp',
          oldValue: '8',
          newValue: '9',
        },
      ],
    });
  });

  it('is a no-op (no write, no audit) when nothing changed', async () => {
    const $transaction = jest.fn();
    const prisma = {
      platformConfig: { findUnique: jest.fn().mockResolvedValue(row()) },
      $transaction,
    } as unknown as PrismaService;

    await makeService(prisma).update({ serviceFeePhp: 7 }, 'dev-admin');

    expect($transaction).not.toHaveBeenCalled();
  });
});
