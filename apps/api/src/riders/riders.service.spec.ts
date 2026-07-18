import { RidersService } from './riders.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('RidersService', () => {
  it('queries active RIDER users with a minimal projection', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'r1', displayName: 'Rider One', phone: '+639170000002' },
    ]);
    const prisma = { user: { findMany } } as unknown as PrismaService;
    const service = new RidersService(prisma);

    const out = await service.listRiders();

    const arg = findMany.mock.calls[0][0];
    expect(arg.where).toEqual({ roles: { has: 'RIDER' }, disabledAt: null });
    expect(arg.select).toEqual({ id: true, displayName: true, phone: true });
    expect(out).toEqual([
      { id: 'r1', displayName: 'Rider One', phone: '+639170000002' },
    ]);
  });
});
