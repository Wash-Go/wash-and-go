import { Module } from '@nestjs/common';
import { ShopsModule } from '../shops/shops.module';
import { RemittanceController } from './remittance.controller';
import { ShopRemittanceController } from './shop-remittance.controller';
import { RemittanceRepository } from './remittance.repository';
import { RemittanceService } from './remittance.service';
import { ShopRemittanceService } from './shop-remittance.service';

@Module({
  imports: [ShopsModule], // ShopAccessService for the shop-facing routes
  controllers: [RemittanceController, ShopRemittanceController],
  providers: [RemittanceService, RemittanceRepository, ShopRemittanceService],
  exports: [RemittanceService],
})
export class RemittanceModule {}
