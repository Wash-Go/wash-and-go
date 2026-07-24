import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RecordDepositDto } from './dto/rider-cash.dto';
import { RiderCashService } from './rider-cash.service';

/*
 * Ops rider-cash reconciliation (money model: platform intermediates). Shows how
 * much COD each rider still owes the platform and records deposits. ADMIN only.
 */
@ApiTags('admin-rider-cash')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('admin/riders')
export class RiderCashController {
  constructor(private readonly cash: RiderCashService) {}

  @Get('cash')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Outstanding COD per rider (collected − deposited)' })
  summary() {
    return this.cash.summary();
  }

  @Get(':id/cash')
  @Roles('ADMIN')
  @ApiOperation({ summary: "One rider's cash balance + deposit history" })
  async detail(@Param('id') id: string) {
    const [balance, deposits] = await Promise.all([
      this.cash.balance(id),
      this.cash.listDeposits(id),
    ]);
    return { balance, deposits };
  }

  @Post(':id/cash/deposit')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Record a rider handing cash back to the platform' })
  deposit(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RecordDepositDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.cash.recordDeposit(
      id,
      dto.amountPhp,
      user.firebaseUid,
      dto.reference,
      dto.note,
      idempotencyKey,
    );
  }
}
