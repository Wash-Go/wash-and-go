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
import { ShopAccessService } from './shop-access.service';
import { ShopProfileController } from './shop-profile.controller';
import { ShopProfileService } from './shop-profile.service';
import { ShopPayoutController } from './shop-payout.controller';
import { ShopPayoutService } from './shop-payout.service';

@Module({
  // AdminShopsService notifies owners on verify/reject; onboarding submit reads
  // whether uploads are configured.
  imports: [NotificationsModule, UploadsModule],
  controllers: [
    ShopsController,
    AdminShopsController,
    ShopOnboardingController,
    ShopServicesController,
    ShopProfileController,
    ShopPayoutController,
  ],
  providers: [
    ShopsService,
    AdminShopsService,
    ShopAccessService,
    ShopOnboardingService,
    ShopServicesService,
    ShopProfileService,
    ShopPayoutService,
  ],
})
export class ShopsModule {}
