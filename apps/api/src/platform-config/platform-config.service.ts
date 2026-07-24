import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformConfig, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { DeliveryConfig } from '../pricing/distance';

/*
 * Platform-level business rules, admin-editable at runtime (no redeploy).
 * Singleton row (id = 1). Env vars are only the bootstrap defaults: the first
 * read seeds the row from them, the DB wins after. Per-shop rates stay on
 * ShopService (laundry portal) — this store is platform-level only.
 *
 * expressWeightThresholdKg is the Express weight ceiling (kg) — the booking flow
 * rejects load categories over it and points them at Scheduled (Tier 1).
 * Placeholders (minOrderPricePhp, platformFeePhp) are editable but have NO
 * consumer yet — inert until floor/fee code lands.
 */

// The flat, editable field set (DB columns). The admin API + editor speak this.
export const CONFIG_FIELDS = [
  'serviceFeePhp',
  'deliveryBasePhp',
  'deliveryFreeKm',
  'deliveryPerKmPhp',
  'deliveryMaxPhp',
  'deliveryRoadFactor',
  'maxResolveKm',
  'expressWeightThresholdKg',
  'minOrderPricePhp',
  'platformFeePhp',
] as const;

export type ConfigField = (typeof CONFIG_FIELDS)[number];

// Flat view (numbers) — for the admin GET/PUT and the editor form.
export type PlatformConfigDto = Record<ConfigField, number> & {
  updatedAt: Date;
};

// Grouped view — what the pricing/matching engines consume.
export interface PlatformConfigValues {
  serviceFeePhp: string;
  delivery: DeliveryConfig;
  maxResolveKm: number;
  expressWeightThresholdKg: number;
  minOrderPricePhp: string;
  platformFeePhp: string;
  updatedAt: Date;
}

export type ConfigPatch = Partial<Record<ConfigField, number>>;

/*
 * Cross-field invariants the per-field `≥ 0` check can't catch. A misconfigured
 * delivery fee silently misprices EVERY order, so these are guarded server-side
 * (mirrored client-side in the editor). Pure + exported for tests.
 *  - cap ≥ base: else `min(base + …, max)` caps below base even at 0 km.
 *  - roadFactor ≥ 1: haversine is a lower bound on real road distance, so the
 *    multiplier can never legitimately shrink it; 0 collapses distance to base.
 */
export function assertConfigInvariants(v: {
  deliveryBasePhp: number;
  deliveryMaxPhp: number;
  deliveryRoadFactor: number;
}): void {
  if (v.deliveryMaxPhp < v.deliveryBasePhp) {
    throw new BadRequestException(
      'deliveryMaxPhp (cap) must be ≥ deliveryBasePhp (base)',
    );
  }
  if (v.deliveryRoadFactor < 1) {
    throw new BadRequestException('deliveryRoadFactor must be ≥ 1');
  }
}

@Injectable()
export class PlatformConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly env: ConfigService,
  ) {}

  private envNum(key: string, def: number): number {
    const v = Number(this.env.get<string>(key));
    return Number.isFinite(v) && v !== 0 ? v : def;
  }

  // Bootstrap defaults (env-overridable) used only when the row does not exist.
  private defaults(): Record<ConfigField, number> {
    return {
      serviceFeePhp: this.envNum('SERVICE_FEE_PHP', 7),
      deliveryBasePhp: this.envNum('DELIVERY_BASE_PHP', 40),
      deliveryFreeKm: this.envNum('DELIVERY_FREE_KM', 2),
      deliveryPerKmPhp: this.envNum('DELIVERY_PER_KM_PHP', 8),
      deliveryMaxPhp: this.envNum('DELIVERY_MAX_PHP', 150),
      deliveryRoadFactor: this.envNum('DELIVERY_ROAD_FACTOR', 1.3),
      maxResolveKm: this.envNum('MAX_RESOLVE_KM', 20),
      expressWeightThresholdKg: this.envNum('EXPRESS_WEIGHT_THRESHOLD_KG', 6),
      minOrderPricePhp: this.envNum('MIN_ORDER_PRICE_PHP', 0),
      platformFeePhp: this.envNum('PLATFORM_FEE_PHP', 0),
    };
  }

  // Read the singleton, creating it from defaults on first access.
  private async ensure(): Promise<PlatformConfig> {
    const existing = await this.prisma.platformConfig.findUnique({
      where: { id: 1 },
    });
    if (existing) return existing;
    return this.prisma.platformConfig.create({
      data: { id: 1, ...this.defaults() },
    });
  }

  private toDto(row: PlatformConfig): PlatformConfigDto {
    const out = { updatedAt: row.updatedAt } as PlatformConfigDto;
    for (const f of CONFIG_FIELDS) out[f] = Number(row[f]);
    return out;
  }

  // Flat numeric view for the admin API + editor.
  async getRaw(): Promise<PlatformConfigDto> {
    return this.toDto(await this.ensure());
  }

  // Grouped view for the pricing/matching engines.
  async getValues(): Promise<PlatformConfigValues> {
    const r = await this.ensure();
    return {
      serviceFeePhp: r.serviceFeePhp.toString(),
      delivery: {
        baseDeliveryPhp: Number(r.deliveryBasePhp),
        freeKm: Number(r.deliveryFreeKm),
        perKmPhp: Number(r.deliveryPerKmPhp),
        maxDeliveryPhp: Number(r.deliveryMaxPhp),
        roadFactor: Number(r.deliveryRoadFactor),
      },
      maxResolveKm: Number(r.maxResolveKm),
      expressWeightThresholdKg: Number(r.expressWeightThresholdKg),
      minOrderPricePhp: r.minOrderPricePhp.toString(),
      platformFeePhp: r.platformFeePhp.toString(),
      updatedAt: r.updatedAt,
    };
  }

  // Apply a partial update. Validates each field, writes only changed columns,
  // and appends one ConfigAudit row per changed field in the same transaction.
  async update(patch: ConfigPatch, actorUid: string): Promise<PlatformConfigDto> {
    const current = await this.ensure();

    const data: Prisma.PlatformConfigUpdateInput = {};
    const audits: Prisma.ConfigAuditCreateManyInput[] = [];

    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      if (!CONFIG_FIELDS.includes(key as ConfigField)) {
        throw new BadRequestException(`Unknown config field: ${key}`);
      }
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new BadRequestException(
          `Invalid value for ${key}: must be a finite number ≥ 0`,
        );
      }
      const field = key as ConfigField;
      const oldNum = Number(current[field]);
      if (oldNum === value) continue; // no-op, don't audit
      (data as Record<string, number>)[field] = value;
      audits.push({
        actorUid,
        field,
        oldValue: String(oldNum),
        newValue: String(value),
      });
    }

    if (audits.length === 0) return this.toDto(current);

    // Guard cross-field invariants on the MERGED result (patch over current),
    // not just the changed fields — a valid-looking single field can still
    // produce an invalid combination.
    const merged = (f: ConfigField) =>
      f in patch && patch[f] !== undefined ? (patch[f] as number) : Number(current[f]);
    assertConfigInvariants({
      deliveryBasePhp: merged('deliveryBasePhp'),
      deliveryMaxPhp: merged('deliveryMaxPhp'),
      deliveryRoadFactor: merged('deliveryRoadFactor'),
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.platformConfig.update({ where: { id: 1 }, data });
      await tx.configAudit.createMany({ data: audits });
      return row;
    });
    return this.toDto(updated);
  }

  async getAudit(limit = 20) {
    return this.prisma.configAudit.findMany({
      orderBy: { changedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }
}
