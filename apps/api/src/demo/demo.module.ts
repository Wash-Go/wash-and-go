import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationOptions, envValidationSchema } from '../config/env.validation';
import { OrdersModule } from '../orders/orders.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RemittanceModule } from '../remittance/remittance.module';
import { RidersModule } from '../riders/riders.module';

/*
 * The slice of the API the demo scripts boot as a Nest application context
 * (no HTTP, no Firebase guard): the REAL OrdersService / RemittanceService /
 * RiderCashService, so seeded pricing, order events, notifications, remittance
 * lines and batches are exactly what the API writes.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: envValidationOptions,
    }),
    PrismaModule,
    OrdersModule,
    RemittanceModule,
    RidersModule,
  ],
})
export class DemoModule {}
