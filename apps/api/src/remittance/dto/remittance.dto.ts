import { IsISO8601, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

// Close all unbatched lines in [periodStart, periodEnd) into batches. With a
// shopId, closes only that shop; without, closes every shop that has lines.
export class ClosePeriodDto {
  @IsISO8601() periodStart!: string;
  @IsISO8601() periodEnd!: string;
  @IsOptional() @IsString() shopId?: string;
}

export class ListBatchesQueryDto {
  @IsOptional() @IsString() shopId?: string;
  @IsOptional() @IsIn(['PENDING', 'PAID']) status?: 'PENDING' | 'PAID';
}

export class MarkPaidDto {
  // External transfer reference (bank/eWallet). Required, non-empty.
  @IsString() @MinLength(1) reference!: string;
}
