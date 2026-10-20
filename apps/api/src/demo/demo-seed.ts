import { type INestApplicationContext, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { OrderStatus, Prisma, ServiceType, type User, type UserRole } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { RemittanceService } from '../remittance/remittance.service';
import { RiderCashService } from '../riders/rider-cash.service';
import { placeholderPhone } from '../users/phone';
import { DEMO_PREFIX, type DemoConfig } from './demo-config';
import { batchPeriods, demoOrderPlan, eventSteps, type StepKind } from './demo-plan';
import { DemoModule } from './demo.module';

export interface DemoDeps {
  prisma: PrismaService;
  orders: OrdersService;
  remittance: RemittanceService;
  riderCash: RiderCashService;
  config: PlatformConfigService;
}

// Boot the API's own services (no HTTP) for the demo scripts and specs.
export async function bootDemo(): Promise<{ app: INestApplicationContext; deps: DemoDeps }> {
  const app = await NestFactory.createApplicationContext(DemoModule, { logger: ['error', 'warn'] });
  const get = <T>(t: new (...a: never[]) => T) => app.get(t, { strict: false });
  return {
    app,
    deps: {
      prisma: get(PrismaService),
      orders: get(OrdersService),
      remittance: get(RemittanceService),
      riderCash: get(RiderCashService),
      config: get(PlatformConfigService),
    },
  };
}

// The firebaseUid per demo role: from Firebase (by email) when the seed manages
// real accounts, else the deterministic local uids for the x-dev-uid stub.
export interface DemoUids {
  owner: string;
  staff: string;
  admin: string;
  rider: string;
  customers: string[];
}

export function localDemoUids(cfg: DemoConfig): DemoUids {
  return { ...cfg.localUids, customers: [...cfg.localUids.customers] };
}

export const DEMO_PAID_REFERENCE = 'GCASH-DEMO-0001';
export const DEMO_SHOP_PIN = { lat: 6.925, lng: 122.08 };
const SERVICES = [
  {
    code: 'WDF',
    name: 'Wash, Dry & Fold',
    billingUnit: 'PER_KG' as const,
    ratePhp: '25.00',
    turnaroundHours: 24,
  },
  {
    code: 'WDF_IRON',
    name: 'Wash + Iron',
    billingUnit: 'PER_KG' as const,
    ratePhp: '35.00',
    turnaroundHours: 48,
  },
  {
    code: 'DRY_CLEAN',
    name: 'Dry Cleaning',
    billingUnit: 'PER_PIECE' as const,
    ratePhp: '120.00',
    turnaroundHours: 72,
  },
];
// Mon–Sat 08:00–18:00, Sunday closed (day 0 = Sunday).
const HOURS = [0, 1, 2, 3, 4, 5, 6].map((day) =>
  day === 0 ? { day, open: null, close: null } : { day, open: '08:00', close: '18:00' },
);

export interface DemoCounts {
  orders: number;
  events: number;
  ratings: number;
  lines: number;
  batches: number;
  notifications: number;
  deposits: number;
}

// Demo users by the marker: display name starts "Demo " AND the uid or email
// is one the config names. The owner (possibly a real person) is not included.
async function markedDemoUsers(prisma: Prisma.TransactionClient, cfg: DemoConfig): Promise<User[]> {
  const e = cfg.emails;
  const u = cfg.localUids;
  return prisma.user.findMany({
    where: {
      displayName: { startsWith: DEMO_PREFIX },
      OR: [
        { firebaseUid: { in: [u.staff, u.admin, u.rider, ...u.customers] } },
        { email: { in: [e.staff, e.admin, e.rider, ...e.customers] } },
      ],
    },
  });
}

// The demo shop: the configured name AND the demo owner is an OWNER member
// (a same-named shop someone else runs is never treated as demo data).
async function findDemoShop(prisma: Prisma.TransactionClient, cfg: DemoConfig, uids: DemoUids) {
  return prisma.shop.findFirst({
    where: {
      name: cfg.shopName,
      members: { some: { role: 'OWNER', user: { firebaseUid: uids.owner } } },
    },
  });
}

async function demoOrderIds(
  prisma: Prisma.TransactionClient,
  cfg: DemoConfig,
  uids: DemoUids,
): Promise<{ shopId: string | null; orderIds: string[]; userIds: string[]; riderIds: string[] }> {
  const shop = await findDemoShop(prisma, cfg, uids);
  const users = await markedDemoUsers(prisma, cfg);
  const userIds = users.map((x) => x.id);
  const orders = await prisma.order.findMany({
    where: {
      pickupAddress: { startsWith: DEMO_PREFIX },
      OR: [...(shop ? [{ shopId: shop.id }] : []), { customerId: { in: userIds } }],
    },
    select: { id: true },
  });
  return {
    shopId: shop?.id ?? null,
    orderIds: orders.map((o) => o.id),
    userIds,
    riderIds: users.filter((x) => x.roles.includes('RIDER')).map((x) => x.id),
  };
}

export async function demoCounts(
  prisma: PrismaService,
  cfg: DemoConfig,
  uids: DemoUids,
): Promise<DemoCounts> {
  const { shopId, orderIds, userIds, riderIds } = await demoOrderIds(prisma, cfg, uids);
  const [events, ratings, lines, batches, notifications, deposits] = await Promise.all([
    prisma.orderEvent.count({ where: { orderId: { in: orderIds } } }),
    prisma.rating.count({ where: { orderId: { in: orderIds } } }),
    prisma.remittanceLine.count({ where: { orderId: { in: orderIds } } }),
    shopId ? prisma.remittanceBatch.count({ where: { shopId } }) : 0,
    prisma.notification.count({
      where: { OR: [{ orderId: { in: orderIds } }, { userId: { in: userIds } }] },
    }),
    prisma.riderCashDeposit.count({ where: { riderId: { in: riderIds } } }),
  ]);
  return { orders: orderIds.length, events, ratings, lines, batches, notifications, deposits };
}

/*
 * Delete demo-marked order data only, children first, in one transaction:
 * order events, ratings, remittance lines and notifications of demo orders;
 * the demo shop's batches once they have no lines left; demo users' inbox
 * notifications and the demo rider's cash deposits; then the demo orders.
 * Users, the shop, services and memberships are kept (the seed upserts them).
 */
export async function clearDemoOrders(
  prisma: PrismaService,
  cfg: DemoConfig,
  uids: DemoUids,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const { shopId, orderIds, userIds, riderIds } = await demoOrderIds(tx, cfg, uids);
    await tx.orderEvent.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.rating.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.remittanceLine.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.notification.deleteMany({
      where: { OR: [{ orderId: { in: orderIds } }, { userId: { in: userIds } }] },
    });
    await tx.riderCashDeposit.deleteMany({ where: { riderId: { in: riderIds } } });
    await tx.order.deleteMany({ where: { id: { in: orderIds } } });
    if (shopId) await tx.remittanceBatch.deleteMany({ where: { shopId, lines: { none: {} } } });
  });
}

async function upsertUser(
  prisma: PrismaService,
  p: { uid: string; email: string; name: string; roles: UserRole[]; keepName?: boolean },
): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { firebaseUid: p.uid } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        email: p.email,
        roles: [...new Set([...existing.roles, ...p.roles])],
        ...(p.keepName && existing.displayName ? {} : { displayName: p.name }),
        disabledAt: null,
      },
    });
  }
  return prisma.user.create({
    data: {
      firebaseUid: p.uid,
      phone: placeholderPhone(p.uid),
      displayName: p.name,
      email: p.email,
      roles: [...new Set(p.roles)],
    },
  });
}

export interface DemoUsers {
  owner: User;
  staff: User;
  admin: User;
  rider: User;
  customers: User[];
}

export async function ensureDemoUsers(
  prisma: PrismaService,
  cfg: DemoConfig,
  uids: DemoUids,
): Promise<DemoUsers> {
  const e = cfg.emails;
  return {
    // The owner may be a real person: keep their name if they have one.
    owner: await upsertUser(prisma, {
      uid: uids.owner,
      email: e.owner,
      name: 'Demo Owner',
      roles: ['CUSTOMER', 'SHOP_OWNER'],
      keepName: true,
    }),
    staff: await upsertUser(prisma, {
      uid: uids.staff,
      email: e.staff,
      name: 'Demo Staff',
      roles: ['SHOP_STAFF'],
    }),
    admin: await upsertUser(prisma, {
      uid: uids.admin,
      email: e.admin,
      name: 'Demo Admin',
      roles: ['ADMIN'],
    }),
    rider: await upsertUser(prisma, {
      uid: uids.rider,
      email: e.rider,
      name: 'Demo Rider',
      roles: ['RIDER'],
    }),
    customers: await Promise.all(
      uids.customers.map((uid, i) =>
        upsertUser(prisma, {
          uid,
          email: e.customers[i],
          name: `Demo Customer ${i + 1}`,
          roles: ['CUSTOMER'],
        }),
      ),
    ),
  };
}

export async function ensureDemoShop(
  prisma: PrismaService,
  cfg: DemoConfig,
  users: DemoUsers,
  now: Date,
): Promise<{ shopId: string; serviceIds: Record<string, string>; warnings: string[] }> {
  const warnings: string[] = [];
  for (const s of SERVICES) {
    const found = await prisma.serviceCatalogItem.findUnique({ where: { code: s.code } });
    if (!found) {
      await prisma.serviceCatalogItem.create({
        data: { code: s.code, name: s.name, billingUnit: s.billingUnit },
      });
    }
  }
  const data = {
    name: cfg.shopName,
    address: 'Tetuan, Zamboanga City',
    lat: new Prisma.Decimal(DEMO_SHOP_PIN.lat),
    lng: new Prisma.Decimal(DEMO_SHOP_PIN.lng),
    active: true,
    status: 'VERIFIED' as const,
    submittedAt: new Date(now.getTime() - 31 * 86_400_000),
    verifiedAt: new Date(now.getTime() - 30 * 86_400_000),
    rejectionReason: null,
    contactPhone: '+639171234567',
    description: 'Wash, dry & fold, ironing and dry cleaning in Tetuan. Same-day Express.',
    hours: HOURS as unknown as Prisma.InputJsonValue,
    expressSlotsPerDay: 10,
    payoutMethod: null,
    payoutAccountName: null,
    payoutAccountNumber: null,
    payoutBankName: null,
    payoutUpdatedAt: null,
  };
  const existing = await prisma.shop.findFirst({
    where: { name: cfg.shopName, members: { some: { userId: users.owner.id, role: 'OWNER' } } },
  });
  if (!existing && (await prisma.shop.count({ where: { name: cfg.shopName } })) > 0) {
    throw new Error(
      `A shop named "${cfg.shopName}" exists that the demo owner does not own. ` +
        'Set DEMO_SHOP_NAME to a different name (or use that shop owner as DEMO_OWNER_EMAIL).',
    );
  }
  const shop = existing
    ? await prisma.shop.update({ where: { id: existing.id }, data })
    : await prisma.shop.create({ data });

  const serviceIds: Record<string, string> = {};
  for (const s of SERVICES) {
    const item = await prisma.serviceCatalogItem.findUniqueOrThrow({ where: { code: s.code } });
    const fields = {
      ratePhp: new Prisma.Decimal(s.ratePhp),
      turnaroundHours: s.turnaroundHours,
      active: true,
    };
    const row = await prisma.shopService.upsert({
      where: { shopId_serviceId: { shopId: shop.id, serviceId: item.id } },
      create: { shopId: shop.id, serviceId: item.id, ...fields },
      update: fields,
    });
    serviceIds[s.code] = row.id;
  }

  for (const [user, role] of [
    [users.owner, 'OWNER'],
    [users.staff, 'STAFF'],
  ] as const) {
    await prisma.shopMember.upsert({
      where: { shopId_userId: { shopId: shop.id, userId: user.id } },
      create: { shopId: shop.id, userId: user.id, role },
      update: { role },
    });
  }
  const otherOwned = await prisma.shopMember.count({
    where: { userId: users.owner.id, role: 'OWNER', shopId: { not: shop.id } },
  });
  if (otherOwned) {
    warnings.push(
      `${cfg.emails.owner} also owns ${otherOwned} other shop(s); /shop/* resolves the lowest membership id, which may not be the demo shop.`,
    );
  }

  await prisma.riderProfile.upsert({
    where: { userId: users.rider.id },
    create: {
      userId: users.rider.id,
      status: 'VERIFIED',
      submittedAt: new Date(now.getTime() - 21 * 86_400_000),
      verifiedAt: new Date(now.getTime() - 20 * 86_400_000),
      vehicleType: 'E-bike',
      vehiclePlate: 'DEMO-01',
    },
    update: {
      status: 'VERIFIED',
      rejectionReason: null,
      vehicleType: 'E-bike',
      vehiclePlate: 'DEMO-01',
    },
  });
  return { shopId: shop.id, serviceIds, warnings };
}

export interface SeedSummary {
  shopId: string;
  orders: Array<{ label: string; code: string; status: OrderStatus; serviceType: ServiceType }>;
  batches: {
    paid: { id: string; reference: string | null; lineCount: number };
    pending: { id: string; lineCount: number };
  };
  unbatchedLines: number;
  depositPhp: string;
  warnings: string[];
}

// Event status written for each plan step (WEIGH re-records the current
// status with meta.weighedKg, as OrdersService.weigh does).
const STEP_STATUS: Record<StepKind, OrderStatus> = {
  BOOKED: 'BOOKED',
  ASSIGNED: 'ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  AT_SHOP: 'AT_SHOP',
  WEIGH: 'AT_SHOP',
  PROCESSING: 'PROCESSING',
  READY_FOR_RETURN: 'READY_FOR_RETURN',
  OUT_FOR_RETURN: 'OUT_FOR_RETURN',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
};

/*
 * Seed (or re-seed) the demo dataset. Idempotent: upserts users / shop /
 * services / rider, clears demo-marked orders, then books and advances 14
 * orders through the REAL OrdersService (pricing, events, notifications, the
 * remittance line on delivery), closes two remittance periods and marks one
 * paid through RemittanceService, and records the rider's cash deposit through
 * RiderCashService. The only direct writes are timestamps (see the report).
 */
export const PRODUCTION_CLEAR_REFUSED =
  'Refusing to replace existing demo orders with NODE_ENV=production. Re-run with DEMO_RESET_CONFIRM=yes.';

export async function seedDemo(
  deps: DemoDeps,
  cfg: DemoConfig,
  uids: DemoUids,
  now: Date = new Date(),
  // false (production without DEMO_RESET_CONFIRM=yes): a first seed is fine,
  // but existing demo orders are never cleared.
  opts: { allowClear?: boolean } = {},
): Promise<SeedSummary> {
  const { prisma, orders } = deps;
  const log = new Logger('DemoSeed');
  if (opts.allowClear === false && (await demoCounts(prisma, cfg, uids)).orders > 0) {
    throw new Error(PRODUCTION_CLEAR_REFUSED);
  }
  const users = await ensureDemoUsers(prisma, cfg, uids);
  const { shopId, serviceIds, warnings } = await ensureDemoShop(prisma, cfg, users, now);
  await clearDemoOrders(prisma, cfg, uids);

  // Auto-dispatch would hand seed orders to any verified rider; Scheduled
  // bookings never auto-dispatch, so fall back to them when it is on.
  const { autoDispatchEnabled } = await deps.config.getValues();
  if (autoDispatchEnabled > 0) {
    warnings.push(
      'Auto-dispatch is ON: seed orders are booked as Scheduled so the demo rider gets them.',
    );
  }

  const plan = demoOrderPlan(now);
  const booked: Array<{ id: string; code: string }> = [];

  // Phase 1: book every order and assign the demo rider before any delivery,
  // so the rider's COD cap (checked at assignment) sees nothing outstanding.
  for (const item of plan) {
    const customer = users.customers[item.customer];
    const serviceType = autoDispatchEnabled > 0 ? 'SCHEDULED' : item.serviceType;
    const dto = {
      shopServiceId: serviceIds[item.serviceCode],
      pickupAddress: item.pickupAddress,
      pickupLat: item.pickupLat,
      pickupLng: item.pickupLng,
      loadCategory: item.load,
      serviceType,
      ...(serviceType === 'SCHEDULED'
        ? { scheduledPickupAt: new Date(now.getTime() + 3_600_000).toISOString() }
        : {}),
    } as const;
    const order =
      serviceType === 'SCHEDULED'
        ? await orders.createScheduledOrder(customer, dto as never)
        : await orders.createExpressOrder(customer, dto as never);
    // Backdate now, so the next Express booking's per-day slot count is right.
    await prisma.order.update({
      where: { id: order.id },
      data: {
        createdAt: item.bookedAt,
        ...(serviceType === 'SCHEDULED'
          ? { scheduledPickupAt: new Date(item.bookedAt.getTime() + 2 * 3_600_000) }
          : {}),
      },
    });
    if (item.target !== 'CANCELLED') {
      await orders.assignRider(users.admin, order.id, { riderId: users.rider.id });
    }
    booked.push({ id: order.id, code: order.code });
  }

  // Phase 2: drive each order to its target with the actor the API requires.
  for (const [i, item] of plan.entries()) {
    const id = booked[i].id;
    const move = (actor: User, status: OrderStatus, reason?: string) =>
      orders.transition(actor, id, { status, ...(reason ? { reason } : {}) });
    for (const { kind } of eventSteps(item, now)) {
      if (kind === 'BOOKED' || kind === 'ASSIGNED') continue;
      if (
        kind === 'PICKED_UP' ||
        kind === 'AT_SHOP' ||
        kind === 'OUT_FOR_RETURN' ||
        kind === 'DELIVERED'
      ) {
        await move(users.rider, kind);
      } else if (kind === 'WEIGH') {
        await orders.weigh(users.owner, id, { weightKg: item.weighKg! });
      } else if (kind === 'PROCESSING' || kind === 'READY_FOR_RETURN') {
        await move(users.owner, kind);
      } else if (kind === 'CANCELLED') {
        await move(users.admin, 'CANCELLED', item.cancelReason);
      }
    }
    if (item.rating) {
      await orders.rateOrder(users.customers[item.customer], id, item.rating);
    }
  }

  // Phase 3 (direct writes, timestamps only): spread the history over the plan.
  for (const [i, item] of plan.entries()) {
    const id = booked[i].id;
    const steps = eventSteps(item, now);
    const events = await prisma.orderEvent.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'asc' },
    });
    const used = new Set<string>();
    for (const s of steps) {
      const isWeigh = s.kind === 'WEIGH';
      const ev = events.find(
        (e) =>
          !used.has(e.id) &&
          e.status === STEP_STATUS[s.kind] &&
          Boolean((e.meta as { weighedKg?: number } | null)?.weighedKg) === isWeigh,
      );
      if (!ev) continue;
      used.add(ev.id);
      await prisma.orderEvent.update({ where: { id: ev.id }, data: { createdAt: s.at } });
    }
    const last = steps[steps.length - 1].at;
    if (item.target === 'DELIVERED') {
      await prisma.order.update({ where: { id }, data: { deliveredAt: last, paidCashAt: last } });
      await prisma.remittanceLine.updateMany({ where: { orderId: id }, data: { createdAt: last } });
    }
    if (item.target === 'CANCELLED') {
      await prisma.order.update({ where: { id }, data: { cancelledAt: last } });
    }
    if (item.rating) {
      await prisma.rating.updateMany({
        where: { orderId: id },
        data: {
          createdAt: new Date(Math.min(last.getTime() + 2 * 3_600_000, now.getTime() - 60_000)),
        },
      });
    }
    await prisma.notification.updateMany({ where: { orderId: id }, data: { createdAt: last } });
  }

  // Phase 4: payouts through RemittanceService.
  const periods = batchPeriods(plan, now);
  const paid = await deps.remittance.closeBatch(shopId, periods.PAID);
  const pending = await deps.remittance.closeBatch(shopId, periods.PENDING);
  if (!paid || !pending) throw new Error('Demo seed: expected two remittance batches');
  const paidOut = await deps.remittance.markPaid(
    paid.id,
    DEMO_PAID_REFERENCE,
    users.admin.firebaseUid,
  );
  await prisma.remittanceBatch.update({
    where: { id: paid.id },
    data: {
      createdAt: new Date(periods.PAID.periodEnd.getTime() + 2 * 3_600_000),
      paidAt: new Date(periods.PAID.periodEnd.getTime() + 6 * 3_600_000),
    },
  });
  await prisma.remittanceBatch.update({
    where: { id: pending.id },
    data: { createdAt: new Date(periods.PENDING.periodEnd.getTime() + 2 * 3_600_000) },
  });
  const unbatchedLines = await prisma.remittanceLine.count({ where: { shopId, batchId: null } });

  // Phase 5: the rider hands the collected cash in, so the live driver can
  // assign them again (the COD cap is checked at assignment).
  const bal = await deps.riderCash.balance(users.rider.id);
  let depositPhp = '0.00';
  if (Number(bal.outstandingPhp) > 0) {
    await deps.riderCash.recordDeposit(
      users.rider.id,
      Number(bal.outstandingPhp),
      users.admin.firebaseUid,
      'DEMO-DEPOSIT',
      'Demo seed: cash handed in',
      `demo-seed-deposit-${now.getTime()}`,
    );
    depositPhp = Number(bal.outstandingPhp).toFixed(2);
  }

  const final = await prisma.order.findMany({
    where: { id: { in: booked.map((b) => b.id) } },
    select: { id: true, code: true, status: true, serviceType: true },
  });
  const byId = new Map(final.map((o) => [o.id, o]));
  for (const w of warnings) log.warn(w);
  return {
    shopId,
    orders: plan.map((p, i) => {
      const o = byId.get(booked[i].id)!;
      return { label: p.label, code: o.code, status: o.status, serviceType: o.serviceType };
    }),
    batches: {
      paid: { id: paidOut.id, reference: paidOut.reference, lineCount: paidOut.lineCount },
      pending: { id: pending.id, lineCount: pending.lineCount },
    },
    unbatchedLines,
    depositPhp,
    warnings,
  };
}

// demo:reset — clear demo-marked rows, re-seed, report before/after counts.
export async function resetDemo(
  deps: DemoDeps,
  cfg: DemoConfig,
  uids: DemoUids,
  now: Date = new Date(),
): Promise<{ before: DemoCounts; after: DemoCounts; summary: SeedSummary }> {
  const before = await demoCounts(deps.prisma, cfg, uids);
  await clearDemoOrders(deps.prisma, cfg, uids);
  const summary = await seedDemo(deps, cfg, uids, now);
  const after = await demoCounts(deps.prisma, cfg, uids);
  return { before, after, summary };
}
