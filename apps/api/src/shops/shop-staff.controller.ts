import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateShopInviteDto } from './dto/shop-staff.dto';
import { ShopStaffService } from './shop-staff.service';
import { ShopInviteDoc, ShopMemberDoc } from './dto/shop-views.dto';

/*
 * The caller's shop team (portal B4 "Staff" screen). Shop is derived from the
 * caller's ShopMember row; the members list is OWNER or STAFF, everything
 * that changes the team is OWNER-only.
 */
@ApiTags('shop-staff')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('shop')
export class ShopStaffController {
  constructor(private readonly staff: ShopStaffService) {}

  @Get('members')
  @Roles('SHOP_OWNER', 'SHOP_STAFF')
  @ApiOperation({
    summary: "The caller's shop members (name, email, role, joined)",
  })
  @ApiOkResponse({ type: ShopMemberDoc, isArray: true })
  members(@CurrentUser() user: User) {
    return this.staff.listMembers(user.id);
  }

  @Delete('members/:memberId')
  @HttpCode(204)
  @Roles('SHOP_OWNER')
  @ApiParam({
    name: 'memberId',
    description: 'ShopMember id from GET /shop/members',
  })
  @ApiOperation({
    summary: 'Remove a staff member (owner; not an owner or yourself)',
  })
  @ApiNoContentResponse({ description: 'Staff member removed' })
  removeMember(@CurrentUser() user: User, @Param('memberId') memberId: string) {
    return this.staff.removeMember(user.id, memberId);
  }

  @Get('invites')
  @Roles('SHOP_OWNER')
  @ApiOperation({ summary: 'Open staff invites' })
  @ApiOkResponse({ type: ShopInviteDoc, isArray: true })
  invites(@CurrentUser() user: User) {
    return this.staff.listInvites(user.id);
  }

  @Post('invites')
  @Roles('SHOP_OWNER')
  @ApiOperation({
    summary: 'Invite a staff member by email (they accept via POST /shop/invites/:id/accept)',
  })
  @ApiCreatedResponse({ type: ShopInviteDoc })
  invite(@CurrentUser() user: User, @Body() dto: CreateShopInviteDto) {
    return this.staff.createInvite(user.id, dto.email);
  }

  @Delete('invites/:id')
  @HttpCode(204)
  @Roles('SHOP_OWNER')
  @ApiParam({ name: 'id', description: 'Invite id from GET /shop/invites' })
  @ApiOperation({ summary: 'Revoke an open invite' })
  @ApiNoContentResponse({ description: 'Invite revoked' })
  revoke(@CurrentUser() user: User, @Param('id') id: string) {
    return this.staff.revokeInvite(user.id, id);
  }
}
