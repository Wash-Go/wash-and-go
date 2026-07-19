import { IsNumber, IsOptional, Min } from 'class-validator';

// Every field optional — a PUT patches only what it sends. Validation mirrors the
// service guard (finite, ≥ 0); the service still re-checks (defense in depth).
export class UpdateConfigDto {
  @IsOptional() @IsNumber() @Min(0) serviceFeePhp?: number;
  @IsOptional() @IsNumber() @Min(0) deliveryBasePhp?: number;
  @IsOptional() @IsNumber() @Min(0) deliveryFreeKm?: number;
  @IsOptional() @IsNumber() @Min(0) deliveryPerKmPhp?: number;
  @IsOptional() @IsNumber() @Min(0) deliveryMaxPhp?: number;
  @IsOptional() @IsNumber() @Min(0) deliveryRoadFactor?: number;
  @IsOptional() @IsNumber() @Min(0) maxResolveKm?: number;
  @IsOptional() @IsNumber() @Min(0) expressWeightThresholdKg?: number;
  @IsOptional() @IsNumber() @Min(0) minOrderPricePhp?: number;
  @IsOptional() @IsNumber() @Min(0) platformFeePhp?: number;
}
