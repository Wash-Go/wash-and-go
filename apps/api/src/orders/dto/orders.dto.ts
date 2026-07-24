import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, ServiceType } from '@prisma/client';
import { LOAD_CATEGORY_KEYS, LoadCategoryKey } from '../load';
import {
  IsEnum,
  IsIn,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';

const LOAD_KEYS = LOAD_CATEGORY_KEYS as unknown as string[];

export class CreateOrderDto {
  @ApiProperty({ example: 'shopsvc_abc123', description: 'ShopService id (shop + service + rate)' })
  @IsString()
  @IsNotEmpty()
  shopServiceId!: string;

  @ApiProperty({ example: 'Tetuan, Zamboanga City' })
  @IsString()
  @IsNotEmpty()
  pickupAddress!: string;

  @ApiProperty({ example: 6.9111 })
  @IsLatitude()
  pickupLat!: number;

  @ApiProperty({ example: 122.0794 })
  @IsLongitude()
  pickupLng!: number;

  @ApiProperty({ enum: LOAD_KEYS, example: 'M', description: 'Load size category; maps to an estimate kg, rebilled at weigh-in' })
  @IsIn(LOAD_KEYS)
  loadCategory!: LoadCategoryKey;

  @ApiProperty({ required: false, enum: ServiceType, default: ServiceType.EXPRESS, description: 'Omitted → EXPRESS (Tier 2). SCHEDULED (Tier 1) has no weight ceiling.' })
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @ApiProperty({ required: false, example: '2026-07-25T09:00:00+08:00', description: 'Requested pickup time (ISO). Required + must be in the future for SCHEDULED.' })
  @IsOptional()
  @IsISO8601()
  scheduledPickupAt?: string;
}

export class PreviewOrderDto {
  @ApiProperty({ example: 'shopsvc_abc123', description: 'ShopService id (shop + service + rate)' })
  @IsString()
  @IsNotEmpty()
  shopServiceId!: string;

  @ApiProperty({ example: 6, description: 'Estimated kg (from the load-size bucket)' })
  @IsPositive()
  @Max(100)
  weightKg!: number;

  @ApiProperty({ required: false, example: 6.9111, description: 'Customer pickup latitude — enables the distance delivery fee; omitted → base fee' })
  @IsOptional()
  @IsLatitude()
  pickupLat?: number;

  @ApiProperty({ required: false, example: 122.0794 })
  @IsOptional()
  @IsLongitude()
  pickupLng?: number;
}

export class QuoteOrderDto {
  @ApiProperty({ example: 6.9111, description: 'Customer pickup latitude' })
  @IsLatitude()
  pickupLat!: number;

  @ApiProperty({ example: 122.0794 })
  @IsLongitude()
  pickupLng!: number;

  @ApiProperty({ enum: LOAD_KEYS, example: 'M', description: 'Load size category; maps to an estimate kg' })
  @IsIn(LOAD_KEYS)
  loadCategory!: LoadCategoryKey;

  @ApiProperty({ required: false, enum: ServiceType, default: ServiceType.EXPRESS, description: 'SCHEDULED skips the express weight ceiling when pricing.' })
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @ApiProperty({ required: false, description: 'Override shop; omitted → auto-resolve nearest' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  shopServiceId?: string;
}

export class AssignRiderDto {
  @ApiProperty({ example: 'usr_rider1' })
  @IsString()
  @IsNotEmpty()
  riderId!: string;
}

export class WeighDto {
  @ApiProperty({ example: 6.4, description: 'Actual weighed kg — triggers price recompute' })
  @IsPositive()
  @Max(100)
  weightKg!: number;
}

export class TransitionDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PICKED_UP })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiProperty({ required: false, description: 'Reason — recorded when status=CANCELLED' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  reason?: string;
}
