import { Module } from '@nestjs/common';
import { RemittanceController } from './remittance.controller';
import { RemittanceRepository } from './remittance.repository';
import { RemittanceService } from './remittance.service';

@Module({
  controllers: [RemittanceController],
  providers: [RemittanceService, RemittanceRepository],
  exports: [RemittanceService],
})
export class RemittanceModule {}
