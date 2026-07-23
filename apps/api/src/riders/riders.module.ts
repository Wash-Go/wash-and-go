import { Module } from '@nestjs/common';
import { RidersController } from './riders.controller';
import { RidersService } from './riders.service';
import { RiderCashController } from './rider-cash.controller';
import { RiderCashService } from './rider-cash.service';
import { RiderCashRepository } from './rider-cash.repository';

@Module({
  controllers: [RidersController, RiderCashController],
  providers: [RidersService, RiderCashService, RiderCashRepository],
})
export class RidersModule {}
