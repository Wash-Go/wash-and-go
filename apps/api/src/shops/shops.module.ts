import { Module } from '@nestjs/common';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';
import { AdminShopsController } from './admin-shops.controller';
import { AdminShopsService } from './admin-shops.service';

@Module({
  controllers: [ShopsController, AdminShopsController],
  providers: [ShopsService, AdminShopsService],
})
export class ShopsModule {}
