import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ShopHoursDayDto } from '../shop-hours';

/*
 * The owner-editable shop profile fields, shared by PATCH /shop/onboarding
 * (draft) and PATCH /shop/me (verified). All optional: send only what changed.
 * Cross-field rules (PH mobile normalization, hours) live in
 * profileFieldsData / normalizeHours, also shared.
 */
export class ShopProfileFieldsDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) address?: string;
  @IsOptional() @IsLatitude() lat?: number;
  @IsOptional() @IsLongitude() lng?: number;
  // Any PH mobile form (0917…, +63917…, spaces/dashes ok); normalized to
  // +639XXXXXXXXX, anything else is a 400.
  @IsOptional() @IsString() @MaxLength(20) contactPhone?: string;
  // Blank clears it.
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  // Exactly 7 entries, one per weekday.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => ShopHoursDayDto)
  hours?: ShopHoursDayDto[];
  // Express queue capacity per Asia/Manila day.
  @IsOptional() @IsInt() @Min(0) @Max(50) expressSlotsPerDay?: number;
}

// PATCH /shop/me — the profile fields only; proof keys move through onboarding.
export class UpdateShopProfileDto extends ShopProfileFieldsDto {}
