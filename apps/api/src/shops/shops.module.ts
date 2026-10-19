import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';
import { AdminShopsController } from './admin-shops.controller';
import { AdminShopsService } from './admin-shops.service';
import { ShopOnboardingController } from './shop-onboarding.controller';
import { ShopOnboardingService } from './shop-onboarding.service';
import { ShopServicesController } from './shop-services.controller';
import { ShopServicesService } from './shop-services.service';

@Module({
  // AdminShopsService notifies owners on verify/reject; onboarding submit reads
  // whether uploads are configured.
  imports: [NotificationsModule, UploadsModule],
  controllers: [
    ShopsController,
    AdminShopsController,
    ShopOnboardingController,
    ShopServicesController,
  ],
  providers: [ShopsService, AdminShopsService, ShopOnboardingService, ShopServicesService],
})
export class ShopsModule {}
