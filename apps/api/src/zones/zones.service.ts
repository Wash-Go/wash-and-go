import { BadRequestException, Injectable } from '@nestjs/common';
import { Zone } from '@prisma/client';
import { LatLng, pointInPolygon, ZAMBOANGA_PILOT_RING } from './geo';
import { ZonesRepository } from './zones.repository';

/*
 * Coverage + zone resolution. A pickup is covered when it lands inside any
 * active zone. Until an admin draws real zones, isCovered falls back to the
 * pilot Zamboanga ring, so coverage keeps working with an empty table (no seed
 * required, launch stays safe). Replaces the hardcoded orders/coverage.ts gate.
 */
@Injectable()
export class ZonesService {
  constructor(private readonly repo: ZonesRepository) {}

  async isCovered(point: LatLng): Promise<boolean> {
    const zones = await this.repo.findActive();
    if (zones.length === 0) {
      return pointInPolygon(point, ZAMBOANGA_PILOT_RING);
    }
    return zones.some((z) => pointInPolygon(point, this.ring(z)));
  }

  // The active zone containing the point, or null (out of coverage).
  async resolve(point: LatLng): Promise<Zone | null> {
    const zones = await this.repo.findActive();
    return zones.find((z) => pointInPolygon(point, this.ring(z))) ?? null;
  }

  list(): Promise<Zone[]> {
    return this.repo.findAll();
  }

  async create(name: string, polygon: LatLng[]): Promise<Zone> {
    this.assertRing(polygon);
    return this.repo.create({ name, polygon: polygon as unknown as object });
  }

  setActive(id: string, active: boolean): Promise<Zone> {
    return this.repo.setActive(id, active);
  }

  private ring(zone: Zone): LatLng[] {
    const raw = zone.polygon as unknown;
    return Array.isArray(raw) ? (raw as LatLng[]) : [];
  }

  private assertRing(polygon: LatLng[]): void {
    if (!Array.isArray(polygon) || polygon.length < 3) {
      throw new BadRequestException('A zone polygon needs at least 3 vertices');
    }
    for (const p of polygon) {
      if (
        typeof p?.lat !== 'number' ||
        typeof p?.lng !== 'number' ||
        !Number.isFinite(p.lat) ||
        !Number.isFinite(p.lng)
      ) {
        throw new BadRequestException('Each vertex must be { lat, lng } numbers');
      }
    }
  }
}
