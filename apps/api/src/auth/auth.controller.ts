import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import type { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';

class SessionDto {
  @IsString()
  @MinLength(1)
  idToken!: string;
}

type MeResponse = {
  id: string;
  phone: string;
  displayName: string;
  roles: string[];
};

function toMe(user: User): MeResponse {
  return {
    id: user.id,
    phone: user.phone,
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
}
