import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { DEV_UID, UpsertDevUserDto } from './dev-users.dto';
import { DevUsersService } from './dev-users.service';

/*
 * DEV ONLY (AUTH_DEV_BYPASS=1 in development/test; see dev-routes.ts). E2E
 * fixture users. Still behind the global FirebaseAuthGuard — any
 * authenticated caller (e.g. x-dev-uid: dev-admin) may use it, never an
 * anonymous one; the stub is already full impersonation, so no @Roles.
 */
@ApiTags('dev')
@ApiBearerAuth()
@Controller('dev/users')
export class DevUsersController {
  constructor(private readonly users: DevUsersService) {}

  @Post()
  @ApiOperation({ summary: 'DEV ONLY: upsert an e2e fixture user by x-dev-uid' })
  @ApiCreatedResponse({ description: 'MeResponse shape (id, phone, displayName, roles, …)' })
  upsert(@Body() dto: UpsertDevUserDto) {
    return this.users.upsert(dto);
  }

  @Delete(':uid')
  @HttpCode(204)
  @ApiParam({ name: 'uid', description: 'The fixture user’s x-dev-uid' })
  @ApiOperation({ summary: 'DEV ONLY: delete a fixture user and its solely-owned shops (cascade)' })
  @ApiNoContentResponse({ description: 'Removed (or already absent)' })
  async remove(@Param('uid') uid: string): Promise<void> {
    if (!DEV_UID.test(uid)) throw new BadRequestException('uid must be 1–128 of A–Z a–z 0–9 _ -');
    await this.users.remove(uid);
  }
}
