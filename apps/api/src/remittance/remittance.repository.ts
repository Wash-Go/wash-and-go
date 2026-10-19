import { Injectable } from '@nestjs/common';
import {
  Prisma,
  RemittanceBatch,
  RemittanceLine,
  RemittanceStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Prisma tx client (what $transaction hands the callback).
type Tx = Prisma.TransactionClient;

/*
 * Money domain → repository mandatory (ADR-003). The orchestrating
 * RemittanceService opens the transaction and threads `tx` in; the repo never
 * opens its own.
 */
@Injectable()
export class RemittanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Unbatched payout lines for one shop within [start, end).
  findUnbatchedLines(
    tx: Tx,
    shopId: string,
    start: Date,
    end: Date,
  ): Promise<RemittanceLine[]> {
    return tx.remittanceLine.findMany({
      where: { shopId, batchId: null, createdAt: { gte: start, lt: end } },
    });
  }

  // Distinct shops that have at least one unbatched line in [start, end).
  async distinctUnbatchedShops(
    tx: Tx,
    start: Date,
    end: Date,
  ): Promise<string[]> {
    const rows = await tx.remittanceLine.findMany({
      where: { batchId: null, createdAt: { gte: start, lt: end } },
      distinct: ['shopId'],
      select: { shopId: true },
    });
    return rows.map((r) => r.shopId);
  }

  createBatch(
    tx: Tx,
    data: Prisma.RemittanceBatchUncheckedCreateInput,
  ): Promise<RemittanceBatch> {
    return tx.remittanceBatch.create({ data });
  }

  // Link exactly the given lines to the batch. Guarded to still-unbatched rows
  // so a concurrent close can't steal lines already claimed by another batch.
  assignLinesToBatch(tx: Tx, lineIds: string[], batchId: string): Promise<Prisma.BatchPayload> {
    return tx.remittanceLine.updateMany({
      where: { id: { in: lineIds }, batchId: null },
      data: { batchId },
    });
  }

  findBatchById(id: string): Promise<RemittanceBatch | null> {
    return this.prisma.remittanceBatch.findUnique({ where: { id } });
  }

  markBatchPaid(
    id: string,
    data: { reference: string; paidByUid: string },
  ): Promise<RemittanceBatch> {
    return this.prisma.remittanceBatch.update({
      where: { id },
      data: {
        status: 'PAID',
        reference: data.reference,
        paidByUid: data.paidByUid,
        paidAt: new Date(),
      },
    });
  }

  listBatches(where: Prisma.RemittanceBatchWhereInput): Promise<RemittanceBatch[]> {
    return this.prisma.remittanceBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  // Shop names by id, for labelling batches. RemittanceBatch.shopId has no FK
  // relation, so this is a lookup rather than an include; a missing shop is
  // simply absent from the map.
  async shopNames(shopIds: string[]): Promise<Map<string, string>> {
    const rows = await this.prisma.shop.findMany({
      where: { id: { in: shopIds } },
      select: { id: true, name: true },
    });
    return new Map(rows.map((r) => [r.id, r.name]));
  }

  // Count + payout sum per status over EVERY batch (no take cap), so the
  // console's totals don't depend on which page or filter is showing.
  async totalsByStatus(): Promise<
    { status: RemittanceStatus; count: number; total: Prisma.Decimal }[]
  > {
    const rows = await this.prisma.remittanceBatch.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { totalPhp: true },
    });
    return rows.map((r) => ({
      status: r.status,
      count: r._count._all,
      total: r._sum.totalPhp ?? new Prisma.Decimal(0),
    }));
  }

  // Shops the user is an OWNER/STAFF member of — scopes the shop-facing view.
  async shopIdsForMember(userId: string): Promise<string[]> {
    const rows = await this.prisma.shopMember.findMany({
      where: { userId },
      select: { shopId: true },
    });
    return rows.map((r) => r.shopId);
  }
}
