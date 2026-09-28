import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RemittanceService } from './remittance.service';

/*
 * Shop-facing payout view. A shop owner/staff sees only their own shop's payout
 * batches (what the platform owes them + whether it's been transferred). Scoped
 * by ShopMember — never the whole platform (that's the admin console).
 */
@ApiTags('shop-remittance')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('shop/remittance')
export class ShopRemittanceController {
  constructor(private readonly remittance: RemittanceService) {}

  @Get('batches')
  @Roles('SHOP_OWNER', 'SHOP_STAFF')
  @ApiOperation({ summary: "The caller's shop payout batches (newest first)" })
  batches(@CurrentUser() user: User) {
    return this.remittance.listBatchesForMember(user.id);
  }
}
