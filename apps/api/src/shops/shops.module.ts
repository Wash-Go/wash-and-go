import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';
import { AdminShopsController } from './admin-shops.controller';
import { AdminShopsService } from './admin-shops.service';
import { ShopOnboardingController } from './shop-onboarding.controller';
import { ShopOnboardingService } from './shop-onboarding.service';

@Module({
  // AdminShopsService notifies owners on verify/reject; onboarding submit reads
  // whether uploads are configured.
  imports: [NotificationsModule, UploadsModule],
  controllers: [ShopsController, AdminShopsController, ShopOnboardingController],
  providers: [ShopsService, AdminShopsService, ShopOnboardingService],
})
export class ShopsModule {}
