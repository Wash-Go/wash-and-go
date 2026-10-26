import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// PUT /shop/payout-account. Shape only — the per-method rules (GCash = PH
// mobile and no bank name; BANK = 6–20 digits and a bank name) are checked in
// ShopPayoutService. Messages never interpolate $value: the number must not be
// echoed back in an error body.
export class PutPayoutAccountDto {
  @IsIn(['GCASH', 'BANK']) method!: 'GCASH' | 'BANK';
  @IsString() @MinLength(1) @MaxLength(120) accountName!: string;
  @IsString() @MinLength(1) @MaxLength(40) accountNumber!: string;
  @IsOptional() @IsString() @MaxLength(120) bankName?: string;
}
