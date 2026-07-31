import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { GeocodeResult, MapsProvider } from '@wash-and-go/maps';
import { RolesGuard } from '../common/guards/roles.guard';
import { parseFiniteNumber } from '../common/parse-num';
import { MAPS_PROVIDER } from './maps.constants';

/*
 * Address → coordinates for the booking flow (customer types a pickup) and the
 * admin zone editor (center on an address). Backed by the active MapsProvider;
 * returns null when nothing matches, so the app can fall back to a manual pin.
 */
@ApiTags('geocode')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('geocode')
export class GeocodeController {
  constructor(@Inject(MAPS_PROVIDER) private readonly maps: MapsProvider) {}

  // Any-authenticated: a non-sensitive address-lookup utility (throttler bounds
  // abuse). Was CUSTOMER+ADMIN — widened so the portal/rider can look up an
  // address without a 403.
  @Get()
  @ApiOperation({ summary: 'Geocode an address (returns null if no match)' })
  async geocode(@Query('q') q?: string): Promise<GeocodeResult | null> {
    const query = (q ?? '').trim();
    if (query.length < 2) {
      throw new BadRequestException('Query must be at least 2 characters');
    }
    return this.maps.geocode(query);
  }

  // Typeahead: up to `limit` ranked candidates for an address autocomplete
  // (admin shop editor). Empty array on no match. Any-authenticated like geocode.
  // Each call is a billed TomTom request — cap it tighter than the global 60/min
  // so any authenticated token can't burn the maps quota via the typeahead.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('search')
  @ApiOperation({ summary: 'Address autocomplete — ranked candidates' })
  async search(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ): Promise<GeocodeResult[]> {
    const query = (q ?? '').trim();
    if (query.length < 3) return [];
    const n = Number(limit);
    return this.maps.search(query, Number.isFinite(n) && n > 0 ? n : 5);
  }

  // Coordinates → a human-readable address for the map picker (label the pin the
  // user dropped). Billed TomTom call → throttled. { label: null } when unknown.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('reverse')
  @ApiOperation({ summary: 'Reverse geocode a pinned point → address label' })
  async reverse(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ): Promise<{ label: string | null }> {
    const point = {
      lat: parseFiniteNumber(lat, 'lat'),
      lng: parseFiniteNumber(lng, 'lng'),
    };
    return { label: await this.maps.reverseGeocode(point) };
  }
}
