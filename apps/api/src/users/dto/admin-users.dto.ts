import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ArrayNotEmpty, IsArray, IsEnum } from 'class-validator';

export class SetRolesDto {
  @ApiProperty({
    enum: UserRole,
    isArray: true,
    example: ['CUSTOMER', 'RIDER'],
    description: 'The full set of roles the user should have (replaces the current set).',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(UserRole, { each: true })
  roles!: UserRole[];
}
