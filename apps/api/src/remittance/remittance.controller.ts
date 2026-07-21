import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  ClosePeriodDto,
  ListBatchesQueryDto,
  MarkPaidDto,
} from './dto/remittance.dto';
import { RemittanceService } from './remittance.service';

/*
 * Admin payout console (ADR-003 thin HTTP layer). Ops closes a period into
 * per-shop batches, reviews what's owed, and records the external transfer.
 */
@ApiTags('admin-remittance')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('admin/remittance')
export class RemittanceController {
  constructor(private readonly remittance: RemittanceService) {}

  @Post('close')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Close unbatched payout lines into batches' })
  close(@Body() dto: ClosePeriodDto) {
    const period = {
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
    };
    return dto.shopId
      ? this.remittance
          .closeBatch(dto.shopId, period)
          .then((b) => (b ? [b] : []))
      : this.remittance.closeAllShops(period);
  }

  @Get('batches')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List payout batches' })
  list(@Query() query: ListBatchesQueryDto) {
    return this.remittance.listBatches(query);
  }

  @Post('batches/:id/mark-paid')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Record the external payout transfer (idempotent)' })
  markPaid(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: MarkPaidDto,
  ) {
    return this.remittance.markPaid(id, dto.reference, user.firebaseUid);
  }
}
