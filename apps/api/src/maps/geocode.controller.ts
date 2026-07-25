import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { GeocodeResult, MapsProvider } from '@wash-and-go/maps';
import { RolesGuard } from '../common/guards/roles.guard';
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
}
