import { UserRole } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export const DEV_UID = /^[A-Za-z0-9_-]{1,128}$/;

// POST /dev/users — an e2e fixture user keyed by its x-dev-uid.
export class UpsertDevUserDto {
  @IsString() @Matches(DEV_UID, { message: 'uid must be 1–128 of A–Z a–z 0–9 _ -' }) uid!: string;
  @IsOptional() @IsString() @MaxLength(80) displayName?: string;
  // Lowercased on write (User.email has a lowercase CHECK).
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];
}
