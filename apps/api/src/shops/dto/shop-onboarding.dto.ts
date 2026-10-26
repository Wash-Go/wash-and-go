import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ShopProfileFieldsDto } from './shop-profile.dto';

export { HHMM, ShopHoursDayDto } from '../shop-hours';

// Self-serve shop onboarding (owner-driven). All fields optional on update — the
// owner fills the wizard incrementally; submit() enforces the required set.
// Profile fields come from the shared base; proof keys are onboarding-only.
export class UpdateOnboardingDto extends ShopProfileFieldsDto {
  // R2 object keys returned by POST /uploads/presign.
  @IsOptional() @IsString() @MaxLength(300) permitKey?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  photoKeys?: string[];
}

export class RejectShopDto {
  @IsString() @MinLength(1) @MaxLength(300) reason!: string;
}
