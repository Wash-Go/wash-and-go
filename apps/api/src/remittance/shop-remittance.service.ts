import { Injectable, NotFoundException } from '@nestjs/common';
import type { RemittanceBatch } from '@prisma/client';
import { ShopAccessService } from '../shops/shop-access.service';
import { RemittanceRepository } from './remittance.repository';
import { type NamedBatch, shapeBatch } from './remittance.service';

// "Owed, not yet in a batch" for the caller's shop.
export interface ShopPendingRemittanceView {
  totalPhp: string; // 2dp, like the admin summary totals
  lineCount: number;
  oldestLineAt: string | null;
}

export interface RemittanceLineView {
  id: string;
  orderId: string;
  orderCode: string;
  deliveredAt: string | null;
  washValuePhp: string; // 2dp
  commissionPhp: string; // 2dp
  payoutPhp: string; // 2dp
  createdAt: string;
}

export type RemittanceBatchDetailView = NamedBatch & {
  lines: RemittanceLineView[];
};

const NOT_FOUND = 'Batch not found';

/*
 * Shop-facing payout reads (portal B5). The shop is ALWAYS the caller's
 * ShopMember shop via the shared ShopAccessService (OWNER before STAFF, then
 * lowest member id) — the same shop /shop/me and /shop/services resolve — and
 * never a client-sent id. paidByUid (which admin's Firebase UID marked the
 * transfer) is nulled in every shop view; reference + paidAt are the proof.
 */
@Injectable()
export class ShopRemittanceService {
  constructor(
    private readonly repo: RemittanceRepository,
    private readonly access: ShopAccessService,
  ) {}

  async listBatches(userId: string): Promise<NamedBatch[]> {
    const shopId = await this.shopIdOrNull(userId);
    if (!shopId) return [];
    const batches = await this.repo.listBatches({ shopId });
    return this.named(batches);
  }

  async pending(userId: string): Promise<ShopPendingRemittanceView> {
    const { shopId } = await this.access.membership(userId);
    const p = await this.repo.pendingForShop(shopId);
    return {
      totalPhp: p.total.toFixed(2),
      lineCount: p.count,
      oldestLineAt: p.oldest ? p.oldest.toISOString() : null,
    };
  }

  async batchDetail(userId: string, batchId: string): Promise<RemittanceBatchDetailView> {
    const { shopId } = await this.access.membership(userId);
    const found = await this.repo.findBatchWithLines(batchId);
    // Another shop's batch is indistinguishable from a missing one.
    if (!found || found.shopId !== shopId) throw new NotFoundException(NOT_FOUND);
    const { lines, ...batch } = found;
    const [named] = await this.named([batch]);
    return {
      ...named,
      // The repo orders in SQL; sort again so the contract doesn't hinge on it.
      lines: [...lines]
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
        .map((l) => ({
          id: l.id,
          orderId: l.orderId,
          orderCode: l.order.code,
          deliveredAt: l.order.deliveredAt ? l.order.deliveredAt.toISOString() : null,
          washValuePhp: l.washValuePhp.toFixed(2),
          commissionPhp: l.commissionPhp.toFixed(2),
          payoutPhp: l.payoutPhp.toFixed(2),
          createdAt: l.createdAt.toISOString(),
        })),
    };
  }

  // The list keeps its old "no shop → []" contract.
  private async shopIdOrNull(userId: string): Promise<string | null> {
    try {
      return (await this.access.membership(userId)).shopId;
    } catch (e) {
      if (e instanceof NotFoundException) return null;
      throw e;
    }
  }

  private async named(batches: RemittanceBatch[]): Promise<NamedBatch[]> {
    if (batches.length === 0) return [];
    const names = await this.repo.shopNames([...new Set(batches.map((b) => b.shopId))]);
    return batches.map((b) => ({
      ...shapeBatch(b, names.get(b.shopId) ?? null),
      paidByUid: null,
    }));
  }
}
