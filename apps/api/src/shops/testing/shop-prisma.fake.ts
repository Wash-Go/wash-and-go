/*
 * In-memory stand-in for the slice of Prisma the shop self-management
 * services use (shop, shopMember, user, shopInvite, serviceCatalogItem,
 * shopService). Specs seed rows, run the real service, then assert on the
 * tables — so ownership scoping is proven against data, not against mock
 * call shapes. Supports plain-equality `where` (null matches null/undefined),
 * compound unique keys, `orderBy` arrays, `include` of shop/user/service, and
 * `$transaction(fn)`. Test-only; nothing in the app imports it.
 */
type Row = Record<string, unknown> & { id: string };
type Where = Record<string, unknown>;
type OrderBy = Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;

export interface FakeTables {
  shop: Row[];
  shopMember: Row[];
  user: Row[];
  shopInvite: Row[];
  serviceCatalogItem: Row[];
  shopService: Row[];
}

const COMPOUND: Record<string, string[]> = {
  shopId_userId: ['shopId', 'userId'],
  shopId_email: ['shopId', 'email'],
  shopId_serviceId: ['shopId', 'serviceId'],
};

function flatten(where: Where): Where {
  const out: Where = {};
  for (const [k, v] of Object.entries(where)) {
    if (COMPOUND[k] && v && typeof v === 'object') Object.assign(out, v);
    else out[k] = v;
  }
  return out;
}

function matches(row: Row, where: Where = {}): boolean {
  return Object.entries(flatten(where)).every(([k, v]) => {
    if (v === null) return row[k] == null;
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const op = v as Record<string, unknown>;
      if ('not' in op) return op.not === null ? row[k] != null : row[k] !== op.not;
      if ('in' in op) return (op.in as unknown[]).includes(row[k]);
      if ('has' in op) return ((row[k] as unknown[]) ?? []).includes(op.has);
      throw new Error(`fake: unsupported where op on ${k}`);
    }
    return row[k] === v;
  });
}

function sortRows(rows: Row[], orderBy?: OrderBy): Row[] {
  const keys = orderBy ? (Array.isArray(orderBy) ? orderBy : [orderBy]) : [];
  return [...rows].sort((a, b) => {
    for (const o of keys) {
      const [k, dir] = Object.entries(o)[0];
      const av = a[k] instanceof Date ? (a[k] as Date).getTime() : String(a[k]);
      const bv = b[k] instanceof Date ? (b[k] as Date).getTime() : String(b[k]);
      const c = av < bv ? -1 : av > bv ? 1 : 0;
      if (c) return dir === 'desc' ? -c : c;
    }
    return 0;
  });
}

let seq = 0;
const nextId = (p: string) => `${p}-${++seq}`;

export function fakeShopPrisma(seed: Partial<FakeTables> = {}) {
  const t: FakeTables = {
    shop: [],
    shopMember: [],
    user: [],
    shopInvite: [],
    serviceCatalogItem: [],
    shopService: [],
    ...seed,
  };

  const relation: Record<string, (row: Row) => unknown> = {
    shop: (r) => t.shop.find((s) => s.id === r.shopId) ?? null,
    user: (r) => t.user.find((u) => u.id === r.userId) ?? null,
    service: (r) => t.serviceCatalogItem.find((c) => c.id === r.serviceId) ?? null,
  };
  const withIncludes = (row: Row, include?: Record<string, unknown>) => {
    if (!include) return { ...row };
    const out: Record<string, unknown> = { ...row };
    for (const k of Object.keys(include)) out[k] = relation[k](row);
    return out;
  };

  const defaults: Record<keyof FakeTables, () => Record<string, unknown>> = {
    shop: () => ({}),
    shopMember: () => ({ createdAt: new Date() }),
    user: () => ({ roles: [], email: null, disabledAt: null, createdAt: new Date() }),
    shopInvite: () => ({
      role: 'STAFF',
      createdAt: new Date(),
      acceptedAt: null,
      acceptedUserId: null,
      revokedAt: null,
    }),
    serviceCatalogItem: () => ({}),
    shopService: () => ({ active: true }),
  };
  const uniques: Partial<Record<keyof FakeTables, string[][]>> = {
    shopMember: [['shopId', 'userId']],
    shopInvite: [['shopId', 'email']],
    shopService: [['shopId', 'serviceId']],
  };
  const p2002 = () =>
    Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });

  function model(name: keyof FakeTables) {
    const rows = () => t[name];
    const one = (where: Where) => rows().find((r) => matches(r, where)) ?? null;
    const assertUnique = (candidate: Row) => {
      for (const keys of uniques[name] ?? []) {
        if (
          rows().some(
            (r) => r.id !== candidate.id && keys.every((k) => r[k] === candidate[k]),
          )
        )
          throw p2002();
      }
    };
    return {
      findUnique: async (a: { where: Where; include?: Record<string, unknown> }) => {
        const r = one(a.where);
        return r ? withIncludes(r, a.include) : null;
      },
      findFirst: async (a: { where?: Where; orderBy?: OrderBy; include?: Record<string, unknown> }) => {
        const r = sortRows(rows().filter((x) => matches(x, a.where)), a.orderBy)[0];
        return r ? withIncludes(r, a.include) : null;
      },
      findMany: async (a: { where?: Where; orderBy?: OrderBy; include?: Record<string, unknown> } = {}) =>
        sortRows(rows().filter((x) => matches(x, a.where)), a.orderBy).map((r) =>
          withIncludes(r, a.include),
        ),
      count: async (a: { where?: Where } = {}) => rows().filter((x) => matches(x, a.where)).length,
      create: async (a: { data: Record<string, unknown>; include?: Record<string, unknown> }) => {
        const row = { ...defaults[name](), ...a.data, id: (a.data.id as string) ?? nextId(name) } as Row;
        assertUnique(row);
        rows().push(row);
        return withIncludes(row, a.include);
      },
      update: async (a: { where: Where; data: Record<string, unknown>; include?: Record<string, unknown> }) => {
        const r = one(a.where);
        if (!r) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
        const next = { ...r, ...a.data } as Row;
        assertUnique(next);
        Object.assign(r, a.data);
        return withIncludes(r, a.include);
      },
      updateMany: async (a: { where: Where; data: Record<string, unknown> }) => {
        const hit = rows().filter((x) => matches(x, a.where));
        hit.forEach((r) => Object.assign(r, a.data));
        return { count: hit.length };
      },
      upsert: async (a: {
        where: Where;
        create: Record<string, unknown>;
        update: Record<string, unknown>;
        include?: Record<string, unknown>;
      }) => {
        const r = one(a.where);
        if (r) {
          Object.assign(r, a.update);
          return withIncludes(r, a.include);
        }
        const row = { ...defaults[name](), ...a.create, id: nextId(name) } as Row;
        rows().push(row);
        return withIncludes(row, a.include);
      },
      delete: async (a: { where: Where }) => {
        const r = one(a.where);
        if (!r) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
        t[name] = rows().filter((x) => x !== r);
        return r;
      },
    };
  }

  const prisma: Record<string, unknown> = {
    shop: model('shop'),
    shopMember: model('shopMember'),
    user: model('user'),
    shopInvite: model('shopInvite'),
    serviceCatalogItem: model('serviceCatalogItem'),
    shopService: model('shopService'),
  };
  prisma.$transaction = async (fn: (tx: unknown) => unknown) => fn(prisma);
  return { prisma: prisma as never, tables: t };
}
