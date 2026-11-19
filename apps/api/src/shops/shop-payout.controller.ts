import { Body, Controller, Delete, HttpCode, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PutPayoutAccountDto } from './dto/shop-payout.dto';
import { ShopPayoutService } from './shop-payout.service';
import { PayoutAccountDoc } from './dto/shop-views.dto';

/*
 * The caller's shop payout account (OWNER only; money settings). Read it
 * masked via GET /shop/me. The shop comes from the caller's ShopMember row.
 */
@ApiTags('shop-payout')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('shop/payout-account')
export class ShopPayoutController {
  constructor(private readonly payout: ShopPayoutService) {}

  @Put()
  @Roles('SHOP_OWNER')
  @ApiOperation({
    summary: 'Set the payout account (GCash mobile or bank); returns it masked',
  })
  @ApiOkResponse({ type: PayoutAccountDoc })
  put(@CurrentUser() user: User, @Body() dto: PutPayoutAccountDto) {
    return this.payout.put(user.id, dto);
  }

  @Delete()
  @HttpCode(204)
  @Roles('SHOP_OWNER')
  @ApiOperation({ summary: 'Remove the payout account' })
  @ApiNoContentResponse({ description: 'Payout account cleared' })
  remove(@CurrentUser() user: User) {
    return this.payout.remove(user.id);
  }
}
