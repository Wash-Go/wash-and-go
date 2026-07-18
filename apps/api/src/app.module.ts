import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { ShopsModule } from './shops/shops.module';
import { HealthController } from './health.controller';

/*
 * Modular monolith per ADR-003 (Proposed; this codebase is its acceptance slice).
 * Dependency direction: controller/worker → service → repository | provider adapter.
 * Repositories are mandatory for: orders, payments, credits, remittance, dispatch.
 * Whitelisted direct-Prisma domains: notifications, catalog reads, zone lookups.
 * Cross-domain writes: orchestrating service opens prisma.$transaction and passes
 * `tx` into repository methods (explicit tx param — debate D5.2).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OrdersModule,
    ShopsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
