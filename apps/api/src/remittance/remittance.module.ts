import { Module } from '@nestjs/common';
import { ShopAccessService } from '../shops/shop-access.service';
import { RemittanceController } from './remittance.controller';
import { ShopRemittanceController } from './shop-remittance.controller';
import { RemittanceRepository } from './remittance.repository';
import { RemittanceService } from './remittance.service';
import { ShopRemittanceService } from './shop-remittance.service';

@Module({
  controllers: [RemittanceController, ShopRemittanceController],
  // ShopAccessService is stateless (PrismaService only), so it is provided here
  // rather than exported from ShopsModule.
  providers: [RemittanceService, RemittanceRepository, ShopRemittanceService, ShopAccessService],
  exports: [RemittanceService],
})
export class RemittanceModule {}
