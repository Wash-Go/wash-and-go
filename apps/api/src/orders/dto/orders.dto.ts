import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsPositive,
  IsString,
  Max,
} from 'class-validator';

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

  @ApiProperty({ example: 6, description: 'Customer weight estimate (kg); rebilled at weigh-in' })
  @IsPositive()
  @Max(100)
  weightEstimateKg!: number;
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
}
