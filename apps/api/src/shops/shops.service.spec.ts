import { Prisma } from '@prisma/client';
import { ShopsService } from './shops.service';
import type { PrismaService } from '../prisma/prisma.service';

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

describe('ShopsService', () => {
  let prisma: { shop: { findMany: jest.Mock } };
  let service: ShopsService;

  beforeEach(() => {
    prisma = { shop: { findMany: jest.fn() } };
    service = new ShopsService(prisma as unknown as PrismaService);
  });

  it('queries active shops + active services in a single include (no N+1)', async () => {
    prisma.shop.findMany.mockResolvedValue([]);
    await service.listActiveWithServices();
    const arg = prisma.shop.findMany.mock.calls[0][0];
    expect(arg.where).toEqual({ active: true });
    expect(arg.include.services.where).toEqual({ active: true });
    expect(arg.include.services.include.service).toBe(true);
  });

  it('shapes the response and never leaks margin fields', async () => {
    prisma.shop.findMany.mockResolvedValue([
      {
        id: 'shop1',
        name: 'Tetuan',
        address: 'Tetuan, Zamboanga City',
        lat: D('6.9111'),
        lng: D('122.0794'),
        active: true,
        commissionPct: D('12.00'),
        expressSlotsPerDay: 8,
        createdAt: new Date(),
        services: [
          {
            id: 'ss1',
            ratePhp: D('25.00'),
            turnaroundHours: 24,
            service: { code: 'WDF', name: 'Wash, Dry & Fold' },
          },
        ],
      },
    ]);

    const [shop] = await service.listActiveWithServices();

    expect(shop).toEqual({
      id: 'shop1',
      name: 'Tetuan',
      address: 'Tetuan, Zamboanga City',
      lat: D('6.9111'),
      lng: D('122.0794'),
      services: [
        {
          id: 'ss1',
          code: 'WDF',
          name: 'Wash, Dry & Fold',
          ratePhp: D('25.00'),
          turnaroundHours: 24,
        },
      ],
    });
    // margin fields must not appear anywhere in the payload
    expect('commissionPct' in shop).toBe(false);
    expect('expressSlotsPerDay' in shop).toBe(false);
  });
});
