import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RemittanceBatch, RemittanceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RemittanceRepository } from './remittance.repository';

export interface ClosePeriod {
  periodStart: Date;
  periodEnd: Date; // exclusive
}

// Every batch the API returns carries its shop's name (null if the shop row is
// gone — shopId has no FK), so the consoles never show a raw id.
export type NamedBatch = RemittanceBatch & { shopName: string | null };

export interface StatusTotal {
  count: number;
  totalPhp: string; // stringified Decimal, 2dp
}

// Platform-wide payout totals per status, over all batches.
export interface RemittanceSummary {
  pending: StatusTotal;
  paid: StatusTotal;
}

/*
 * Shop payout batching (PLAN §3.2). RemittanceLine rows are written per DELIVERED
 * order by OrdersService; this service groups the still-unbatched lines for a
 * period into one RemittanceBatch per shop (sum of payouts), then an ops user
 * marks a batch paid with the external transfer reference. Payout transfer is
 * external at launch — the batch tracks intent, not an automated bank transfer.
 *
 * Weekly automation (BullMQ repeatable) is deferred; today an admin triggers the
 * close. Realtime/notification emit is deferred until those modules land.
 */
@Injectable()
export class RemittanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: RemittanceRepository,
  ) {}

  // Close one shop's unbatched lines in [periodStart, periodEnd) into a batch.
  // Returns null when there is nothing to batch (no double-empty batches).
  async closeBatch(
    shopId: string,
    period: ClosePeriod,
  ): Promise<NamedBatch | null> {
    this.assertPeriod(period);
    const batch = await this.prisma.$transaction((tx) =>
      this.closeBatchTx(tx, shopId, period),
    );
    return batch ? (await this.withShopNames([batch]))[0] : null;
  }

  // Close every shop that has unbatched lines in the period — one batch each.
  async closeAllShops(period: ClosePeriod): Promise<NamedBatch[]> {
    this.assertPeriod(period);
    const batches = await this.prisma.$transaction(async (tx) => {
      const shopIds = await this.repo.distinctUnbatchedShops(
        tx,
        period.periodStart,
        period.periodEnd,
      );
      const batches: RemittanceBatch[] = [];
      for (const shopId of shopIds) {
        const b = await this.closeBatchTx(tx, shopId, period);
        if (b) batches.push(b);
      }
      return batches;
    });
    return this.withShopNames(batches);
  }

  private async closeBatchTx(
    tx: Prisma.TransactionClient,
    shopId: string,
    period: ClosePeriod,
  ): Promise<RemittanceBatch | null> {
    const lines = await this.repo.findUnbatchedLines(
      tx,
      shopId,
      period.periodStart,
      period.periodEnd,
    );
    if (lines.length === 0) return null;

    const total = lines.reduce(
      (acc, l) => acc.add(l.payoutPhp),
      new Prisma.Decimal(0),
    );

    const batch = await this.repo.createBatch(tx, {
      shopId,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      totalPhp: total,
      lineCount: lines.length,
    });
    const assigned = await this.repo.assignLinesToBatch(
      tx,
      lines.map((l) => l.id),
      batch.id,
    );
    // Concurrency guard: assignLinesToBatch only claims lines still unbatched
    // (batchId IS NULL). If a concurrent close grabbed some/all of them first,
    // count < lines.length — throw to roll back this whole tx, so we never leave
    // a phantom batch (totalPhp set, lines missing) that markPaid would double-pay.
    if (assigned.count !== lines.length) {
      throw new ConflictException(
        'This payout period was closed concurrently — please retry.',
      );
    }
    return batch;
  }

  // Shop-facing: only the caller's own shop payout batches. Strip paidByUid — a
  // shop has no business seeing which admin's Firebase UID marked the transfer
  // (the reference + paidAt are enough proof of payment).
  async listBatchesForMember(userId: string): Promise<NamedBatch[]> {
    const shopIds = await this.repo.shopIdsForMember(userId);
    if (shopIds.length === 0) return [];
    const batches = await this.repo.listBatches({ shopId: { in: shopIds } });
    return this.withShopNames(batches.map((b) => ({ ...b, paidByUid: null })));
  }

  async listBatches(filter: {
    shopId?: string;
    status?: 'PENDING' | 'PAID';
  }): Promise<NamedBatch[]> {
    const where: Prisma.RemittanceBatchWhereInput = {};
    if (filter.shopId) where.shopId = filter.shopId;
    if (filter.status) where.status = filter.status;
    return this.withShopNames(await this.repo.listBatches(where));
  }

  // Owed / paid totals across ALL batches. The list is filtered and capped, so
  // the console must not derive its headline numbers from the rows it shows.
  async summary(): Promise<RemittanceSummary> {
    const rows = await this.repo.totalsByStatus();
    const pick = (status: RemittanceStatus): StatusTotal => {
      const r = rows.find((x) => x.status === status);
      return {
        count: r?.count ?? 0,
        totalPhp: (r?.total ?? new Prisma.Decimal(0)).toFixed(2),
      };
    };
    return { pending: pick('PENDING'), paid: pick('PAID') };
  }

  // Record the external payout transfer. Idempotent — a batch already PAID is
  // returned unchanged (re-submitting the same mark-paid is a no-op).
  async markPaid(
    batchId: string,
    reference: string,
    actorUid: string,
  ): Promise<NamedBatch> {
    const batch = await this.repo.findBatchById(batchId);
    if (!batch) throw new NotFoundException('Batch not found');
    const out =
      batch.status === 'PAID'
        ? batch
        : await this.repo.markBatchPaid(batchId, { reference, paidByUid: actorUid });
    return (await this.withShopNames([out]))[0];
  }

  // One shop lookup per call (deduped ids), not one per batch.
  private async withShopNames(batches: RemittanceBatch[]): Promise<NamedBatch[]> {
    if (batches.length === 0) return [];
    const names = await this.repo.shopNames([...new Set(batches.map((b) => b.shopId))]);
    return batches.map((b) => ({ ...b, shopName: names.get(b.shopId) ?? null }));
  }

  private assertPeriod(period: ClosePeriod): void {
    if (period.periodEnd <= period.periodStart) {
      throw new BadRequestException('periodEnd must be after periodStart');
    }
  }
}
