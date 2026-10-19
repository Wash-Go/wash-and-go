import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ShopRemittanceService } from './shop-remittance.service';

/*
 * Shop-facing payout view. A shop owner/staff sees only their own shop's payout
 * batches (what the platform owes them + whether it's been transferred). Scoped
 * by ShopMember via ShopAccessService — never the whole platform (that's the
 * admin console).
 */
@ApiTags('shop-remittance')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('shop/remittance')
export class ShopRemittanceController {
  constructor(private readonly remittance: ShopRemittanceService) {}

  @Get('batches')
  @Roles('SHOP_OWNER', 'SHOP_STAFF')
  @ApiOperation({ summary: "The caller's shop payout batches (newest first)" })
  batches(@CurrentUser() user: User) {
    return this.remittance.listBatches(user.id);
  }

  @Get('pending')
  @Roles('SHOP_OWNER', 'SHOP_STAFF')
  @ApiOperation({ summary: 'Payout owed to the caller’s shop that is not in a batch yet' })
  pending(@CurrentUser() user: User) {
    return this.remittance.pending(user.id);
  }

  @Get('batches/:id')
  @Roles('SHOP_OWNER', 'SHOP_STAFF')
  @ApiParam({ name: 'id', description: 'Batch id from GET /shop/remittance/batches' })
  @ApiOperation({ summary: 'One of the caller’s shop batches with its order lines (404 if not theirs)' })
  batch(@CurrentUser() user: User, @Param('id') id: string) {
    return this.remittance.batchDetail(user.id, id);
  }
}
