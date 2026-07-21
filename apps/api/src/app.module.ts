import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { ShopsModule } from './shops/shops.module';
import { RidersModule } from './riders/riders.module';
import { PlatformConfigModule } from './platform-config/platform-config.module';
import { HealthController } from './health.controller';
import { envValidationSchema, envValidationOptions } from './config/env.validation';

/*
 * Modular monolith per ADR-003 (Proposed; this codebase is its acceptance slice).
 * Dependency direction: controller/worker → service → repository | provider adapter.
 * Repositories are mandatory for: orders, payments, credits, remittance, dispatch.
 * Whitelisted direct-Prisma domains: notifications, catalog reads, zone lookups.
 * Cross-domain writes: orchestrating service opens prisma.$transaction and passes
 * `tx` into repository methods (debate D5.2).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: envValidationOptions,
    }),
    // A6: global rate limit (default 60 req/min per client). Default in-memory
    // storage — swap to the Redis storage adapter when BullMQ/Redis lands.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    OrdersModule,
    ShopsModule,
    RidersModule,
    PlatformConfigModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
