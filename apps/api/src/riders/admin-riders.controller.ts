import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminRidersService } from './admin-riders.service';
import { RejectRiderDto } from './dto/rider-onboarding.dto';

/*
 * Admin rider verification review queue (checkpoint D). ADMIN-only. Sits at
 * /admin/riders/applications + :id/verify + :id/reject — distinct paths from the
 * existing rider-cash routes.
 */
@ApiTags('admin-riders')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('admin/riders')
export class AdminRidersController {
  constructor(private readonly riders: AdminRidersService) {}

  @Get('applications')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Review queue — riders submitted for verification' })
  applications() {
    return this.riders.listApplications();
  }

  @Post(':id/verify')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Approve a submitted rider → VERIFIED (dispatchable)' })
  verify(@Param('id') id: string) {
    return this.riders.verify(id);
  }

  @Post(':id/reject')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reject a submitted rider with a reason' })
  reject(@Param('id') id: string, @Body() dto: RejectRiderDto) {
    return this.riders.reject(id, dto.reason);
  }
}
