import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import { visiblePhone } from '../users/phone';

class SessionDto {
  @IsString()
  @MinLength(1)
  idToken!: string;
}

// PATCH /auth/me body. The phone FORMAT is validated (and normalized) in
// AuthService.updateMe so the rule lives in one function; this only bounds the
// shape. Unknown fields (roles, …) are refused by the global ValidationPipe.
export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}

type MeResponse = {
  id: string;
  // null until the user adds a mobile number (the placeholder is never shown).
  phone: string | null;
  displayName: string;
  roles: string[];
};

export function toMe(user: User): MeResponse {
  return {
    id: user.id,
    phone: visiblePhone(user.phone),
    displayName: user.displayName,
    roles: user.roles,
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Public: brand-new Firebase users have no Postgres row yet, so this endpoint
  // verifies the token itself and creates/updates the User (debate A2).
  // Tighter than the global bucket: this public endpoint verifies a Firebase
  // token + writes a User, so cap per-IP abuse (30/min).
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Public()
  @Post('session')
  async session(@Body() dto: SessionDto): Promise<MeResponse> {
    const user = await this.auth.sessionUpsert({ bearer: dto.idToken });
    return toMe(user);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: User): MeResponse {
    return toMe(user);
  }

  // Any signed-in role edits their OWN name / mobile number (U0 T4). 400 on a
  // number that isn't a PH mobile; 409 when another account already has it.
  @ApiBearerAuth()
  @Patch('me')
  async updateMe(
    @CurrentUser() user: User,
    @Body() dto: UpdateMeDto,
  ): Promise<MeResponse> {
    return toMe(await this.auth.updateMe(user, dto));
  }
}
