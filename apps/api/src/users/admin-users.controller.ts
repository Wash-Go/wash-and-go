import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminUsersService } from './admin-users.service';
import { SetRolesDto } from './dto/admin-users.dto';

/*
 * Admin user directory + role/status administration (checkpoint O). ADMIN only.
 * Grants roles to already-signed-in users (onboarding riders/shops) and
 * enables/disables accounts.
 */
@ApiTags('admin-users')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @Roles('ADMIN')
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'q', required: false, description: 'phone or name search' })
  @ApiOperation({ summary: 'List users (optional role filter + search)' })
  list(@Query('role') role?: UserRole, @Query('q') q?: string) {
    return this.users.list({ role, q });
  }

  @Patch(':id/roles')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Set a user’s roles (grant RIDER / SHOP / ADMIN)' })
  setRoles(
    @CurrentUser() actor: User,
    @Param('id') id: string,
    @Body() dto: SetRolesDto,
  ) {
    return this.users.setRoles(actor, id, dto.roles);
  }

  @Post(':id/disable')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Disable an account (blocks sign-in)' })
  disable(@CurrentUser() actor: User, @Param('id') id: string) {
    return this.users.setDisabled(actor, id, true);
  }

  @Post(':id/enable')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Re-enable a disabled account' })
  enable(@CurrentUser() actor: User, @Param('id') id: string) {
    return this.users.setDisabled(actor, id, false);
  }
}
