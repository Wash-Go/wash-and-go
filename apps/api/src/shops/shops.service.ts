import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { haversineKm } from '../pricing/distance';

/*
 * Catalog read (ADR-003 direct-Prisma whitelist — no repository needed). The
 * customer app calls this to discover shops + their services before booking.
 * The response is SHAPED: internal margin fields (commissionPct,
 * expressSlotsPerDay) are never sent to the client.
 */
export interface ShopServiceView {
  id: string; // ShopService id (what POST /orders needs)
  code: string;
  name: string;
  ratePhp: Prisma.Decimal;
  turnaroundHours: number;
}

export interface ShopView {
  id: string;
  name: string;
  address: string;
  lat: Prisma.Decimal;
  lng: Prisma.Decimal;
  services: ShopServiceView[];
  distanceKm?: number; // present when a location is passed (nearest-first)
}

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  // Single query with a nested include — no N+1 (perf P2). When a pickup location
  // is passed, annotate each shop with haversine distanceKm and sort nearest-first
  // (powers the "change laundry" chooser).
  async listActiveWithServices(loc?: {
    lat: number;
    lng: number;
  }): Promise<ShopView[]> {
    const shops = await this.prisma.shop.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        services: {
          where: { active: true },
          include: { service: true },
        },
      },
    });

    const mapped: ShopView[] = shops.map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      // commissionPct + expressSlotsPerDay deliberately omitted — margin data
      // stays server-side.
      services: s.services.map((ss) => ({
        id: ss.id,
        code: ss.service.code,
        name: ss.service.name,
        ratePhp: ss.ratePhp,
        turnaroundHours: ss.turnaroundHours,
      })),
      ...(loc
        ? {
            distanceKm:
              Math.round(
                haversineKm(loc, { lat: Number(s.lat), lng: Number(s.lng) }) * 10,
              ) / 10,
          }
        : {}),
    }));

    if (loc) {
      mapped.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }
    return mapped;
  }
}
