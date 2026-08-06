import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// Self-serve rider onboarding. Doc keys come from POST /uploads/presign.
export class UpdateRiderOnboardingDto {
  @IsOptional() @IsString() @MaxLength(300) licenseKey?: string;
  @IsOptional() @IsString() @MaxLength(300) idKey?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(40) vehicleType?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(20) vehiclePlate?: string;
}

export class RejectRiderDto {
  @IsString() @MinLength(1) @MaxLength(300) reason!: string;
}
