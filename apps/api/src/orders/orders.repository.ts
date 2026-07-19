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
