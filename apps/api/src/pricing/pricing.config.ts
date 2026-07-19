import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DeliveryConfig } from './distance';

/*
 * Config-driven fees (CEO D1). Per-shop wash rate + commission come from the DB;
 * these are platform-level. Provisional pilot values, refundable until the CEO
 * signs the rate card. Later these move to the admin-editable dynamic-config
 * store (no redeploy) — the interface stays the same.
 */
@Injectable()
export class PricingConfig {
  constructor(private readonly config: ConfigService) {}

  private num(key: string, def: number): number {
    const v = Number(this.config.get<string>(key));
    return Number.isFinite(v) && v !== 0 ? v : def;
  }

  get serviceFeePhp(): string {
    return this.config.get<string>('SERVICE_FEE_PHP', '7');
  }

  // Distance-based express delivery (money-path plan). Round-trip haversine ×
  // road-factor, base + per-km beyond a free radius, capped.
  get delivery(): DeliveryConfig {
    return {
      baseDeliveryPhp: this.num('DELIVERY_BASE_PHP', 40),
      freeKm: this.num('DELIVERY_FREE_KM', 2),
      perKmPhp: this.num('DELIVERY_PER_KM_PHP', 8),
      maxDeliveryPhp: this.num('DELIVERY_MAX_PHP', 150),
      roadFactor: this.num('DELIVERY_ROAD_FACTOR', 1.3),
    };
  }
}
