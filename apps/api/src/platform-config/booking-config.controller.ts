import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlatformConfigService } from './platform-config.service';

/*
 * The customer-readable slice of the platform rules (U0 T6). The booking screen
 * decides Express vs Scheduled from the Express weight ceiling, which admins
 * edit at runtime; reading it here keeps the app in step with what quote and
 * create enforce. CUSTOMER-only, the same audience as POST /orders/quote.
 * Admins keep using GET /admin/config for the full row.
 */
@ApiTags('config')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('config')
export class BookingConfigController {
  constructor(private readonly config: PlatformConfigService) {}

  @Get('booking')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Booking rules the customer app gates on (Express weight ceiling)' })
  get() {
    return this.config.getBookingConfig();
  }
}
