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
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

// 24-hour 'HH:MM', 00:00–23:59. Lexical order of two matches is time order.
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/*
 * One day of the weekly opening grid (wizard step 4). `day` is 0 = Sunday …
 * 6 = Saturday (JS Date#getDay). `open`/`close` are both 'HH:MM' or both null
 * (closed that day); the service enforces both-or-neither, open < close, and
 * one entry per day. Stored as-is in Shop.hours (JSONB).
 */
export class ShopHoursDayDto {
  @IsInt() @Min(0) @Max(6) day!: number;
  @ValidateIf((o: ShopHoursDayDto) => o.open !== null)
  @IsString()
  @Matches(HHMM, { message: 'open must be HH:MM (24-hour)' })
  open!: string | null;
  @ValidateIf((o: ShopHoursDayDto) => o.close !== null)
  @IsString()
  @Matches(HHMM, { message: 'close must be HH:MM (24-hour)' })
  close!: string | null;
}

// Self-serve shop onboarding (owner-driven). All fields optional on update — the
// owner fills the wizard incrementally; submit() enforces the required set.
export class UpdateOnboardingDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) address?: string;
  @IsOptional() @IsLatitude() lat?: number;
  @IsOptional() @IsLongitude() lng?: number;
  // R2 object keys returned by POST /uploads/presign.
  @IsOptional() @IsString() @MaxLength(300) permitKey?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(8) @IsString({ each: true }) photoKeys?: string[];
  // Any PH mobile form (0917…, +63917…, spaces/dashes ok); the service
  // normalizes to +639XXXXXXXXX and 400s anything else.
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

export class RejectShopDto {
  @IsString() @MinLength(1) @MaxLength(300) reason!: string;
}
