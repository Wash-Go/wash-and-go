import { ApiProperty } from '@nestjs/swagger';
import type { NamedBatch } from '../remittance.service';
import type {
  RemittanceBatchDetailView,
  RemittanceLineView,
  ShopPendingRemittanceView,
} from '../shop-remittance.service';

// Swagger response schemas for the shop-facing remittance routes. Each class
// implements the service view, so the docs can't silently drift.

export class RemittanceBatchDoc implements NamedBatch {
  @ApiProperty() id!: string;
  @ApiProperty() shopId!: string;
  @ApiProperty({ type: String, nullable: true }) shopName!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) periodStart!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) periodEnd!: Date;
  @ApiProperty({ example: '264.00' }) totalPhp!: string;
  @ApiProperty() lineCount!: number;
  @ApiProperty({ enum: ['PENDING', 'PAID'] }) status!: NamedBatch['status'];
  @ApiProperty({ type: String, nullable: true }) reference!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  paidAt!: Date | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Always null on shop routes',
  })
  paidByUid!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

export class RemittanceLineDoc implements RemittanceLineView {
  @ApiProperty() id!: string;
  @ApiProperty() orderId!: string;
  @ApiProperty({ example: 'WG-2026-000001' }) orderCode!: string;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  deliveredAt!: string | null;
  @ApiProperty({ example: '150.00' }) washValuePhp!: string;
  @ApiProperty({ example: '18.00' }) commissionPhp!: string;
  @ApiProperty({ example: '132.00' }) payoutPhp!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class RemittanceBatchDetailDoc
  extends RemittanceBatchDoc
  implements RemittanceBatchDetailView
{
  @ApiProperty({ type: [RemittanceLineDoc] }) lines!: RemittanceLineView[];
}

export class ShopPendingRemittanceDoc implements ShopPendingRemittanceView {
  @ApiProperty({ example: '264.00' }) totalPhp!: string;
  @ApiProperty() lineCount!: number;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  oldestLineAt!: string | null;
}
