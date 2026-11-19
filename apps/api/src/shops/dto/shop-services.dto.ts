import { IsBoolean, IsInt, IsNumber, IsPositive, Max, Min } from 'class-validator';

// PUT /shop/services/:serviceId — the owner's price for one catalog service.
// Admin DTO bounds plus caps: ratePhp at most ₱99,999 with centavos (fits
// Decimal(10,2) with room), turnaround at most 720 h (30 days). PUT is a full
// replace, so every field — including `active` — is required.
export class PutShopServiceDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() @Max(99999) ratePhp!: number;
  @IsInt() @Min(1) @Max(720) turnaroundHours!: number;
  @IsBoolean() active!: boolean;
}
