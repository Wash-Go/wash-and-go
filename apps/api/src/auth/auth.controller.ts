import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import type { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { CurrentUser, EmailVerified } from './current-user.decorator';
import { visiblePhone } from '../users/phone';

// Only the token: User.email (which staff invites match on) is read from the
// verified token, so any extra body field (email, roles) is refused.
export class SessionDto {
  @IsString()
  @MinLength(1)
  idToken!: string;
}

// PATCH /auth/me body. The phone FORMAT is validated (and normalized) in
// AuthService.updateMe so the rule lives in one function; this only bounds the
// shape. Unknown fields (roles, …) are refused by the global ValidationPipe.
// Omitted = leave unchanged. ValidateIf, not IsOptional: IsOptional also skips
// validation for an explicit null, which must be a 400, not a crash.
const sent = (_: object, v: unknown) => v !== undefined;
export class UpdateMeDto {
  @ValidateIf(sent)
  @IsString()
  @MaxLength(80)
  name?: string;

  @ValidateIf(sent)
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
  // The current token's email is verified by a trusted provider (password,
  // google.com, emailLink). False for the dev stub. The portal prompts for
  // verification when false, since staff invites match only verified emails.
  emailVerified: boolean;
  // A verified email is stored on the account (User.email) — what staff
  // invites match on. The address itself is never returned here.
  inviteEmailOnFile: boolean;
};

export function toMe(user: User, emailVerified: boolean): MeResponse {
  return {
    id: user.id,
    phone: visiblePhone(user.phone),
    displayName: user.displayName,
    roles: user.roles,
    emailVerified,
    inviteEmailOnFile: user.email != null,
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
    const { user, emailVerified } = await this.auth.startSession({
      bearer: dto.idToken,
    });
    return toMe(user, emailVerified);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: User, @EmailVerified() emailVerified: boolean): MeResponse {
    return toMe(user, emailVerified);
  }

  // Any signed-in role edits their OWN name / mobile number (U0 T4). 400 on a
  // number that isn't a PH mobile; 409 when another account already has it.
  @ApiBearerAuth()
  @Patch('me')
  async updateMe(
    @CurrentUser() user: User,
    @EmailVerified() emailVerified: boolean,
    @Body() dto: UpdateMeDto,
  ): Promise<MeResponse> {
    return toMe(await this.auth.updateMe(user, dto), emailVerified);
  }
}
