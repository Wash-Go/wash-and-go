import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class RecordDepositDto {
  @IsNumber() @Min(0.01) amountPhp!: number;
  @IsOptional() @IsString() @MaxLength(120) reference?: string;
  @IsOptional() @IsString() @MaxLength(280) note?: string;
}
