import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateShopProfileDto } from './dto/shop-profile.dto';
import { ShopProfileService } from './shop-profile.service';
import { ShopProfileDoc } from './dto/shop-views.dto';

/*
 * The caller's own shop after onboarding (portal B4 "Shop" screen). Shop is
 * derived from the caller's ShopMember row; OWNER edits, STAFF reads.
 */
@ApiTags('shop-profile')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('shop')
export class ShopProfileController {
  constructor(private readonly profile: ShopProfileService) {}

  @Get('me')
  @Roles('SHOP_OWNER', 'SHOP_STAFF')
  @ApiOperation({
    summary: "The caller's shop profile, hours, capacity and masked payout account",
  })
  @ApiOkResponse({ type: ShopProfileDoc })
  get(@CurrentUser() user: User) {
    return this.profile.get(user.id);
  }

  @Patch('me')
  @Roles('SHOP_OWNER')
  @ApiOperation({
    summary: 'Edit profile, hours and capacity (owner; not while DRAFT/SUBMITTED)',
  })
  @ApiOkResponse({ type: ShopProfileDoc })
  update(@CurrentUser() user: User, @Body() dto: UpdateShopProfileDto) {
    return this.profile.update(user.id, dto);
  }
}
