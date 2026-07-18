import { Module } from '@nestjs/common';
import { PricingConfig } from '../pricing/pricing.config';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, PricingConfig],
})
export class OrdersModule {}
