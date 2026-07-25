import {
  ArrayMaxSize,
  IsArray,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

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
}

export class RejectShopDto {
  @IsString() @MinLength(1) @MaxLength(300) reason!: string;
}
