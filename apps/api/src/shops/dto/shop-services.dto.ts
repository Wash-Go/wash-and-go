import { IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

// PUT /shop/services/:serviceId — the owner's price for one catalog service.
// Same bounds as the admin AddShopServiceDto / UpdateShopServiceDto. PUT is a
// full replace: omitting `active` means active.
export class PutShopServiceDto {
  @IsNumber() @IsPositive() ratePhp!: number;
  @IsInt() @Min(1) turnaroundHours!: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
