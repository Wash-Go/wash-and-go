import { Module } from '@nestjs/common';
import { ZonesController } from './zones.controller';
import { ZonesService } from './zones.service';
import { ZonesRepository } from './zones.repository';

// Exports ZonesService so OrdersModule can use it for the coverage gate.
@Module({
  controllers: [ZonesController],
  providers: [ZonesService, ZonesRepository],
  exports: [ZonesService],
})
export class ZonesModule {}
