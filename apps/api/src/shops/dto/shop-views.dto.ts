import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PendingInviteView, AcceptedMemberView } from '../shop-invite-acceptance.service';
import type { ShopHoursDay } from '../shop-hours';
import type { OwnerShopView } from '../shop-onboarding.service';
import type { PayoutAccountView } from '../shop-payout';
import type { ShopProfileView } from '../shop-profile.service';
import type { OwnerShopServiceView, ShopCatalogItemView } from '../shop-services.service';
import type { ShopInviteView, ShopMemberView } from '../shop-staff.service';

/*
 * Swagger response schemas for the owner/staff /shop/* routes. Each class
 * `implements` the service's view interface, so a field added to a view but
 * not documented here fails the type-check. Response-only: never used as a
 * request body.
 */

const BILLING = ['PER_KG', 'PER_PIECE', 'FLAT'] as const;

export class ShopHoursDayDoc implements ShopHoursDay {
  @ApiProperty({
    minimum: 0,
    maximum: 6,
    description: '0 = Sunday … 6 = Saturday',
  })
  day!: number;
  @ApiProperty({
    type: String,
    nullable: true,
    example: '08:00',
    description: 'HH:MM; null = closed',
  })
  open!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    example: '18:00',
    description: 'HH:MM; null = closed',
  })
  close!: string | null;
}

export class OwnerShopViewDoc implements OwnerShopView {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() address!: string;
  @ApiProperty({ example: '6.9214' }) lat!: string;
  @ApiProperty({ example: '122.079' }) lng!: string;
  @ApiProperty({ enum: ['DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED'] })
  status!: string;
  @ApiProperty({ type: String, nullable: true }) rejectionReason!: string | null;
  @ApiProperty({ type: String, nullable: true }) permitKey!: string | null;
  @ApiProperty({ type: [String] }) photoKeys!: string[];
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  submittedAt!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  verifiedAt!: string | null;
  @ApiProperty({ type: String, nullable: true, example: '+639171234567' })
  contactPhone!: string | null;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ type: [ShopHoursDayDoc], nullable: true }) hours!: ShopHoursDay[] | null;
  @ApiProperty() expressSlotsPerDay!: number;
  @ApiProperty({ description: 'SUBMITTED/VERIFIED without a business permit' })
  documentsPending!: boolean;
  @ApiProperty({ type: String, nullable: true, example: 'uploads/<userId>/<uuid>.png' })
  logoKey!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Presigned GET (5 min) when R2 is configured and a logo is set; else null',
  })
  logoUrl!: string | null;
}

export class ShopCatalogItemDoc implements ShopCatalogItemView {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'WDF' }) code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: BILLING })
  billingUnit!: ShopCatalogItemView['billingUnit'];
}

export class OwnerShopServiceDoc implements OwnerShopServiceView {
  @ApiProperty({ description: 'ShopService row id' }) id!: string;
  @ApiProperty({ description: 'Catalog id (the PUT key)' }) serviceId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: BILLING })
  billingUnit!: OwnerShopServiceView['billingUnit'];
  @ApiProperty({ example: '25.00' }) ratePhp!: string;
  @ApiProperty() turnaroundHours!: number;
  @ApiProperty() active!: boolean;
}

export class PayoutAccountDoc implements PayoutAccountView {
  @ApiProperty({ enum: ['GCASH', 'BANK'] })
  method!: PayoutAccountView['method'];
  @ApiProperty() accountName!: string;
  @ApiProperty({
    example: '•••• 1234',
    description: 'Last 4 only; the full number is never returned',
  })
  accountNumberMasked!: string;
  @ApiProperty({ type: String, nullable: true }) bankName!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  updatedAt!: string | null;
}

export class ShopProfileDoc implements ShopProfileView {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() address!: string;
  @ApiProperty() lat!: string;
  @ApiProperty() lng!: string;
  @ApiProperty({ type: String, nullable: true }) contactPhone!: string | null;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ type: [ShopHoursDayDoc], nullable: true }) hours!: ShopHoursDay[] | null;
  @ApiProperty() expressSlotsPerDay!: number;
  @ApiProperty() status!: string;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  verifiedAt!: string | null;
  @ApiPropertyOptional({ type: PayoutAccountDoc, nullable: true })
  payoutAccount!: PayoutAccountView | null;
  @ApiProperty({ enum: ['OWNER', 'STAFF'] }) myRole!: 'OWNER' | 'STAFF';
  @ApiProperty({ type: String, nullable: true, example: 'uploads/<userId>/<uuid>.png' })
  logoKey!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Presigned GET (5 min) when R2 is configured and a logo is set; else null',
  })
  logoUrl!: string | null;
}

export class ShopMemberDoc implements ShopMemberView {
  @ApiProperty({ description: 'ShopMember id' }) id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty({ enum: ['OWNER', 'STAFF'] }) role!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) email!: string | null;
  @ApiProperty({ format: 'date-time' }) joinedAt!: string;
}

export class ShopInviteDoc implements ShopInviteView {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class PendingInviteDoc implements PendingInviteView {
  @ApiProperty() id!: string;
  @ApiProperty() shopName!: string;
  @ApiProperty() invitedByName!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class AcceptedMemberDoc extends ShopMemberDoc implements AcceptedMemberView {
  @ApiProperty() shopId!: string;
  @ApiProperty() shopName!: string;
}
