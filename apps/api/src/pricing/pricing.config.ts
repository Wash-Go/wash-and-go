import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/*
 * Config-driven fees (CEO D1). The pricing engine is correct regardless of the
 * numbers; these are the provisional pilot values (refundable until the CEO
 * signs the rate card). Per-shop wash rate + commissionPct come from the DB;
 * only the platform-level express delivery + service fees live here.
 */
@Injectable()
export class PricingConfig {
  constructor(private readonly config: ConfigService) {}

  get expressDeliveryFeePhp(): string {
    return this.config.get<string>('EXPRESS_DELIVERY_FEE_PHP', '65');
  }

  get serviceFeePhp(): string {
    return this.config.get<string>('SERVICE_FEE_PHP', '7');
  }
}
