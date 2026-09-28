import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationsService } from './notifications.service';

/*
 * In-app inbox. Any authenticated user reads/marks THEIR OWN notifications
 * (ownership scoped by the token's user id in the service) — no @Roles needed.
 */
@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('me/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'My notifications + unread count (newest first)' })
  list(@CurrentUser() user: User) {
    return this.notifications.list(user.id);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark one notification read' })
  read(@CurrentUser() user: User, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all my notifications read' })
  readAll(@CurrentUser() user: User) {
    return this.notifications.markAllRead(user.id);
  }
}
