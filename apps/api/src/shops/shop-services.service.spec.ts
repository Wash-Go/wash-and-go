import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ShopServicesService } from './shop-services.service';
import type { PrismaService } from '../prisma/prisma.service';

const D = (n: number) => new Prisma.Decimal(n);

const catalog = [
  { id: 'c-wdf', code: 'WDF', name: 'Wash, dry & fold', billingUnit: 'PER_KG' },
  { id: 'c-dry', code: 'DRY_CLEAN', name: 'Dry clean', billingUnit: 'PER_PIECE' },
];

type Member = { userId: string; shopId: string; role: 'OWNER' | 'STAFF' };
type Row = {
  id: string;
  shopId: string;
  serviceId: string;
  ratePhp: Prisma.Decimal;
  turnaroundHours: number;
  active: boolean;
};

/*
 * In-memory Prisma fake: just enough of shopMember / serviceCatalogItem /
 * shopService to prove the service scopes every read and write to the
 * CALLER's ShopMember shop (never a client-supplied shopId).
 */
function make(members: Member[], rows: Row[] = []) {
  const byCatalog = (id: string) => catalog.find((c) => c.id === id) ?? null;
  const withService = (r: Row) => ({ ...r, service: byCatalog(r.serviceId) });
  const upsert = jest.fn(
    ({ where, create, update }: { where: { shopId_serviceId: { shopId: string; serviceId: string } }; create: Omit<Row, 'id'>; update: Partial<Row> }) => {
      const { shopId, serviceId } = where.shopId_serviceId;
      let row = rows.find((r) => r.shopId === shopId && r.serviceId === serviceId);
      if (row) Object.assign(row, update);
      else {
        row = { ...create, id: `ss-${rows.length + 1}` };
        rows.push(row);
      }
      return Promise.resolve(withService(row));
    },
  );
  const prisma = {
    shopMember: {
      // Mirrors the service's query: the caller's membership, OWNER first.
      findFirst: jest.fn(({ where }: { where: { userId: string } }) =>
        Promise.resolve(
          [...members]
            .filter((m) => m.userId === where.userId)
            .sort((a, b) => a.role.localeCompare(b.role))[0] ?? null,
        ),
      ),
    },
    serviceCatalogItem: {
      findMany: jest.fn().mockResolvedValue([...catalog].sort((a, b) => a.code.localeCompare(b.code))),
      findUnique: jest.fn(({ where }: { where: { id: string } }) => Promise.resolve(byCatalog(where.id))),
    },
    shopService: {
      findMany: jest.fn(({ where }: { where: { shopId: string } }) =>
        Promise.resolve(rows.filter((r) => r.shopId === where.shopId).map(withService)),
      ),
      upsert,
    },
  } as unknown as PrismaService;
  return { svc: new ShopServicesService(prisma), rows, upsert };
}

const ownerA: Member = { userId: 'uA', shopId: 'sA', role: 'OWNER' };
const ownerB: Member = { userId: 'uB', shopId: 'sB', role: 'OWNER' };
const staffA: Member = { userId: 'uS', shopId: 'sA', role: 'STAFF' };

const rowB: Row = {
  id: 'ss-b',
  shopId: 'sB',
  serviceId: 'c-wdf',
  ratePhp: D(30),
  turnaroundHours: 24,
  active: true,
};

describe('ShopServicesService', () => {
  it('catalog lists every catalog item for a shop member', async () => {
    const { svc } = make([staffA]);
    expect(await svc.catalog('uS')).toEqual([
      { id: 'c-dry', code: 'DRY_CLEAN', name: 'Dry clean', billingUnit: 'PER_PIECE' },
      { id: 'c-wdf', code: 'WDF', name: 'Wash, dry & fold', billingUnit: 'PER_KG' },
    ]);
  });

  it('a user with no shop gets 404 on every route', async () => {
    const { svc } = make([ownerA]);
    await expect(svc.catalog('nobody')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.list('nobody')).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      svc.upsert('nobody', 'c-wdf', { ratePhp: 25, turnaroundHours: 24 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('list returns only the caller’s shop rows, joined with the catalog', async () => {
    const rowA: Row = { id: 'ss-a', shopId: 'sA', serviceId: 'c-wdf', ratePhp: D(25), turnaroundHours: 48, active: false };
    const { svc } = make([ownerA, ownerB], [rowA, { ...rowB }]);
    expect(await svc.list('uA')).toEqual([
      {
        id: 'ss-a',
        serviceId: 'c-wdf',
        code: 'WDF',
        name: 'Wash, dry & fold',
        billingUnit: 'PER_KG',
        ratePhp: '25.00',
        turnaroundHours: 48,
        active: false,
      },
    ]);
  });

  it('staff can read the shop’s services', async () => {
    const { svc } = make([staffA], [{ ...rowB, id: 'ss-a', shopId: 'sA' }]);
    expect(await svc.list('uS')).toHaveLength(1);
  });

  it('upsert creates a row on the caller’s shop (active by default)', async () => {
    const { svc, upsert } = make([ownerA]);
    const view = await svc.upsert('uA', 'c-wdf', { ratePhp: 25, turnaroundHours: 24 });
    expect(upsert.mock.calls[0][0].where).toEqual({ shopId_serviceId: { shopId: 'sA', serviceId: 'c-wdf' } });
    expect(view).toEqual({
      id: 'ss-1',
      serviceId: 'c-wdf',
      code: 'WDF',
      name: 'Wash, dry & fold',
      billingUnit: 'PER_KG',
      ratePhp: '25.00',
      turnaroundHours: 24,
      active: true,
    });
  });

  it('upsert updates an existing row in place (rate, turnaround, active)', async () => {
    const existing: Row = { id: 'ss-a', shopId: 'sA', serviceId: 'c-wdf', ratePhp: D(25), turnaroundHours: 24, active: true };
    const { svc, rows } = make([ownerA], [existing]);
    const view = await svc.upsert('uA', 'c-wdf', { ratePhp: 27.5, turnaroundHours: 12, active: false });
    expect(rows).toHaveLength(1);
    expect(view).toMatchObject({ id: 'ss-a', ratePhp: '27.50', turnaroundHours: 12, active: false });
  });

  it('upsert 404s an unknown catalog id', async () => {
    const { svc, upsert } = make([ownerA]);
    await expect(
      svc.upsert('uA', 'c-nope', { ratePhp: 25, turnaroundHours: 24 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('staff cannot set rates (403)', async () => {
    const { svc, upsert } = make([staffA]);
    await expect(
      svc.upsert('uS', 'c-wdf', { ratePhp: 25, turnaroundHours: 24 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('cross-shop isolation: owner A never sees or edits shop B’s rows', async () => {
    const b = { ...rowB };
    const { svc, rows } = make([ownerA, ownerB], [b]);
    expect(await svc.list('uA')).toEqual([]);
    await svc.upsert('uA', 'c-wdf', { ratePhp: 99, turnaroundHours: 6 });
    // B's row is untouched; A got its own new row.
    expect(b).toMatchObject({ shopId: 'sB', ratePhp: D(30), turnaroundHours: 24 });
    expect(rows.filter((r) => r.shopId === 'sA')).toHaveLength(1);
    expect((await svc.list('uB'))[0].ratePhp).toBe('30.00');
  });
});
