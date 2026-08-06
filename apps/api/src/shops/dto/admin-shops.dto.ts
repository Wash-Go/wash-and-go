import {
  IsBoolean,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// Admin-facing shop administration (checkpoint C — shop onboarding, code side).
// Margin fields (commissionPct, expressSlotsPerDay) ARE settable here, unlike the
// customer-facing catalog which hides them.

export class CreateShopDto {
  @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @IsString() @MinLength(1) @MaxLength(200) address!: string;
  @IsLatitude() lat!: number;
  @IsLongitude() lng!: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) commissionPct?: number;
  @IsOptional() @IsInt() @Min(0) expressSlotsPerDay?: number;
}

export class UpdateShopDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) address?: string;
  @IsOptional() @IsLatitude() lat?: number;
  @IsOptional() @IsLongitude() lng?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) commissionPct?: number;
  @IsOptional() @IsInt() @Min(0) expressSlotsPerDay?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class AddShopServiceDto {
  @IsString() @MinLength(1) serviceId!: string;
  @IsNumber() @IsPositive() ratePhp!: number;
  @IsInt() @Min(1) turnaroundHours!: number;
}

export class UpdateShopServiceDto {
  @IsOptional() @IsNumber() @IsPositive() ratePhp?: number;
  @IsOptional() @IsInt() @Min(1) turnaroundHours?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class AddShopMemberDto {
  @IsString() @MinLength(1) userId!: string;
  @IsIn(['OWNER', 'STAFF']) role!: 'OWNER' | 'STAFF';
}
