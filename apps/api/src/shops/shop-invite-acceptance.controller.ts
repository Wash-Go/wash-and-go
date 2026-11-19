import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { ShopInviteAcceptanceService } from './shop-invite-acceptance.service';
import { AcceptedMemberDoc, PendingInviteDoc } from './dto/shop-views.dto';

/*
 * The invitee's side of staff invites. No @Roles: the invitee has no shop
 * role yet. Both routes match only the caller's VERIFIED stored email, so
 * they are scoped by identity, not by role.
 */
@ApiTags('shop-staff')
@ApiBearerAuth()
@Controller('shop/invites')
export class ShopInvitesController {
  constructor(private readonly invites: ShopInviteAcceptanceService) {}

  @Get('pending')
  @ApiOperation({
    summary: "Open staff invites for the caller's verified email",
  })
  @ApiOkResponse({ type: PendingInviteDoc, isArray: true })
  pending(@CurrentUser() user: User) {
    return this.invites.pending(user);
  }

  @Post(':id/accept')
  // 200 for the first accept and for a replay by the same member alike.
  @HttpCode(200)
  @ApiParam({
    name: 'id',
    description: 'Invite id from GET /shop/invites/pending',
  })
  @ApiOperation({
    summary:
      'Accept a staff invite (404 unless open and for your verified email; 409 if you already belong to a shop)',
  })
  @ApiOkResponse({
    type: AcceptedMemberDoc,
    description: 'Joined (or already joined via this invite)',
  })
  accept(@CurrentUser() user: User, @Param('id') id: string) {
    return this.invites.accept(user, id);
  }
}
