import type { PrismaService } from '../prisma/prisma.service';
import { OrdersRepository } from './orders.repository';

// Pin the list query's ordering: newest-first keyset by default, oldest-first
// for the active queue.
describe('OrdersRepository.findManyWithRelations ordering', () => {
  function make() {
    const findMany = jest.fn().mockResolvedValue([]);
    const repo = new OrdersRepository({ order: { findMany } } as unknown as PrismaService);
    return { repo, findMany };
  }

  it('defaults to createdAt desc, id desc', async () => {
    const { repo, findMany } = make();
    await repo.findManyWithRelations({}, { take: 50 });
    expect(findMany.mock.calls[0][0].orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
  });

  it("order 'asc' → createdAt asc, id asc", async () => {
    const { repo, findMany } = make();
    await repo.findManyWithRelations({}, { take: 200, order: 'asc' });
    expect(findMany.mock.calls[0][0].orderBy).toEqual([{ createdAt: 'asc' }, { id: 'asc' }]);
    expect(findMany.mock.calls[0][0].take).toBe(200);
  });
});
