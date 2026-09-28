import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RiderCashService } from './rider-cash.service';

/*
 * Rider-facing cash view: a rider sees their OWN outstanding COD + deposit
 * history (what they owe the platform). The admin console has the platform-wide
 * view; this is scoped to the caller.
 */
@ApiTags('me-cash')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('me/cash')
export class MeCashController {
  constructor(private readonly cash: RiderCashService) {}

  @Get()
  @Roles('RIDER')
  @ApiOperation({ summary: 'My cash balance (collected − deposited) + history' })
  async detail(@CurrentUser() user: User) {
    const [balance, deposits] = await Promise.all([
      this.cash.balance(user.id),
      this.cash.listDeposits(user.id),
    ]);
    return { balance, deposits };
  }
}
