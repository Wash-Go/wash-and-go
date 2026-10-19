import { Module } from '@nestjs/common';
import { BookingConfigController } from './booking-config.controller';
import { PlatformConfigController } from './platform-config.controller';
import { PlatformConfigService } from './platform-config.service';

// Exports the service so OrdersModule (pricing + shop-resolve) can read the rules.
@Module({
  controllers: [PlatformConfigController, BookingConfigController],
  providers: [PlatformConfigService],
  exports: [PlatformConfigService],
})
export class PlatformConfigModule {}
