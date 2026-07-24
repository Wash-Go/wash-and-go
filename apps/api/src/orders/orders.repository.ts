import { Injectable } from '@nestjs/common';
import {
  Order,
  OrderStatus,
  Prisma,
  ServiceType,
  Shop,
  ShopService,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ACTIVE_RIDER_STATUSES, selectLeastLoadedRider } from './auto-dispatch';

/*
 * The ONLY Prisma toucher for the orders domain (ADR-003 acceptance seam). The
 * orchestrating OrdersService opens the transaction and threads the tx client
 * into every mutating method here (explicit tx param, debate D5.2). Methods
 * that participate in a money/capacity path REQUIRE a tx; read helpers accept
 * an optional one.
 */
@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── catalog / membership reads (no tx needed) ───────────────────────────
  findByIdempotencyKey(key: string): Promise<Order | null> {
    return this.prisma.order.findUnique({ where: { idempotencyKey: key } });
  }

  findShopServiceWithShop(
    shopServiceId: string,
  ): Promise<(ShopService & { shop: Shop }) | null> {
    return this.prisma.shopService.findUnique({
      where: { id: shopServiceId },
      include: { shop: true },
    });
  }

  // Candidate shop-services for auto-resolve: active service at an active shop.
  findActiveShopServices(): Promise<(ShopService & { shop: Shop })[]> {
    return this.prisma.shopService.findMany({
      where: { active: true, shop: { active: true } },
      include: { shop: true },
    });
  }

  // P4b: today's Express order count per shop (Manila-day window), for the
  // capacity-aware shop match. No tx — a read used during quote resolution.
  async countExpressUsedByShopForDay(
    shopIds: string[],
    dayStartUtc: Date,
    dayEndUtc: Date,
  ): Promise<Map<string, number>> {
    if (shopIds.length === 0) return new Map();
    const grouped = await this.prisma.order.groupBy({
      by: ['shopId'],
      where: {
        shopId: { in: shopIds },
        serviceType: ServiceType.EXPRESS,
        status: { not: OrderStatus.CANCELLED },
        createdAt: { gte: dayStartUtc, lt: dayEndUtc },
      },
      _count: { _all: true },
    });
    const m = new Map<string, number>();
    for (const g of grouped) if (g.shopId) m.set(g.shopId, g._count._all);
    return m;
  }

  // P4a: least-loaded available rider (RIDER role, not disabled) for auto-dispatch,
  // or null if none. Runs inside the create tx so the load count is consistent.
  async pickAutoDispatchRider(
    tx: Prisma.TransactionClient,
  ): Promise<string | null> {
    const riders = await tx.user.findMany({
      where: { roles: { has: 'RIDER' }, disabledAt: null },
      select: { id: true },
    });
    if (riders.length === 0) return null;
    const ids = riders.map((r) => r.id);
    const grouped = await tx.order.groupBy({
      by: ['assignedRiderId'],
      where: {
        assignedRiderId: { in: ids },
        status: { in: ACTIVE_RIDER_STATUSES },
      },
      _count: { _all: true },
    });
    const load = new Map<string, number>();
    for (const g of grouped) {
      if (g.assignedRiderId) load.set(g.assignedRiderId, g._count._all);
    }
    return selectLeastLoadedRider(ids, load);
  }

  async isShopMember(userId: string, shopId: string): Promise<boolean> {
    const m = await this.prisma.shopMember.findUnique({
      where: { shopId_userId: { shopId, userId } },
    });
    return m !== null;
  }

  async userHasRole(userId: string, role: string): Promise<boolean> {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    return u !== null && !u.disabledAt && u.roles.includes(role as never);
  }

  // ── capacity path (all take tx) ─────────────────────────────────────────

  // T1: serialize concurrent bookings per (shop, Manila-day). Transaction-scoped
  // advisory lock — auto-released at commit/rollback, taken BEFORE the count.
  async lockShopDay(
    tx: Prisma.TransactionClient,
    shopId: string,
    manilaDate: string,
  ): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${shopId}), hashtext(${manilaDate}))`;
  }

  // T2: count excludes CANCELLED and buckets by the caller-computed Manila day
  // window [dayStartUtc, dayEndUtc).
  async countExpressOrdersForShopDay(
    tx: Prisma.TransactionClient,
    shopId: string,
    dayStartUtc: Date,
    dayEndUtc: Date,
  ): Promise<number> {
    return tx.order.count({
      where: {
        shopId,
        serviceType: ServiceType.EXPRESS,
        status: { not: OrderStatus.CANCELLED },
        createdAt: { gte: dayStartUtc, lt: dayEndUtc },
      },
    });
  }

  // C1: order code minted from the migration-created sequence, inside the tx.
  async mintOrderCode(tx: Prisma.TransactionClient): Promise<string> {
    const rows = await tx.$queryRaw<{ code: string }[]>`
      SELECT 'WG-'
        || to_char(now() AT TIME ZONE 'Asia/Manila', 'YYYY')
        || '-'
        || lpad(nextval('order_code_seq')::text, 6, '0') AS code`;
    return rows[0].code;
  }

  createOrder(
    tx: Prisma.TransactionClient,
    data: Prisma.OrderCreateInput,
  ): Promise<Order> {
    return tx.order.create({ data });
  }

  // ── order mutation path (take tx) ───────────────────────────────────────

  // Locks the row FOR UPDATE, then returns it. Concurrent transitions on the
  // same order serialize here (T-concurrency).
  async findByIdForUpdate(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<Order | null> {
    await tx.$executeRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
    return tx.order.findUnique({ where: { id } });
  }

  updateOrder(
    tx: Prisma.TransactionClient,
    id: string,
    data: Prisma.OrderUpdateInput,
  ): Promise<Order> {
    return tx.order.update({ where: { id }, data });
  }

  insertOrderEvent(
    tx: Prisma.TransactionClient,
    data: {
      orderId: string;
      status: OrderStatus;
      actorUserId: string | null;
      meta?: Prisma.InputJsonValue;
    },
  ): Promise<{ id: string }> {
    return tx.orderEvent.create({
      data: {
        orderId: data.orderId,
        status: data.status,
        actorUserId: data.actorUserId,
        meta: data.meta,
      },
      select: { id: true },
    });
  }

  // S2: written in the SAME tx as the DELIVERED transition; unique(orderId)
  // makes retries idempotent.
  insertRemittanceLine(
    tx: Prisma.TransactionClient,
    data: {
      orderId: string;
      shopId: string;
      washValuePhp: Prisma.Decimal;
      commissionPhp: Prisma.Decimal;
      payoutPhp: Prisma.Decimal;
    },
  ): Promise<{ id: string }> {
    return tx.remittanceLine.create({ data, select: { id: true } });
  }

  // ── plain reads (no tx) ─────────────────────────────────────────────────
  findById(id: string): Promise<Order | null> {
    return this.prisma.order.findUnique({ where: { id } });
  }

  // Relation-loaded reads for the shaped order detail (rider/customer apps need
  // shop drop-off + contact + the actor's available actions). One query each.
  findByIdWithRelations(id: string): Promise<OrderWithRelations | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: { shop: true, customer: true, assignedRider: true },
    });
  }

  findManyWithRelations(
    where: Prisma.OrderWhereInput,
  ): Promise<OrderWithRelations[]> {
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { shop: true, customer: true, assignedRider: true },
    });
  }
}

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: { shop: true; customer: true; assignedRider: true };
}>;
