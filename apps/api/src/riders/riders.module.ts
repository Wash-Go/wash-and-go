import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RidersController } from './riders.controller';
import { RidersService } from './riders.service';
import { RiderCashController } from './rider-cash.controller';
import { MeCashController } from './me-cash.controller';
import { RiderCashService } from './rider-cash.service';
import { RiderCashRepository } from './rider-cash.repository';
import { RiderOnboardingController } from './rider-onboarding.controller';
import { RiderOnboardingService } from './rider-onboarding.service';
import { AdminRidersController } from './admin-riders.controller';
import { AdminRidersService } from './admin-riders.service';

@Module({
  imports: [NotificationsModule], // AdminRidersService notifies riders on verify/reject
  controllers: [
    RidersController,
    RiderCashController,
    MeCashController,
    RiderOnboardingController,
    AdminRidersController,
  ],
  providers: [
    RidersService,
    RiderCashService,
    RiderCashRepository,
    RiderOnboardingService,
    AdminRidersService,
  ],
})
export class RidersModule {}
