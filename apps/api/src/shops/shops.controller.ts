import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ShopsService } from './shops.service';

@ApiTags('shops')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('shops')
export class ShopsController {
  constructor(private readonly shops: ShopsService) {}

  @Get()
  @Roles('CUSTOMER')
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  @ApiOperation({ summary: 'Active shops + services; nearest-first when lat/lng given' })
  list(@Query('lat') lat?: string, @Query('lng') lng?: string) {
    const loc =
      lat != null && lng != null && lat !== '' && lng !== ''
        ? { lat: Number(lat), lng: Number(lng) }
        : undefined;
    return this.shops.listActiveWithServices(loc);
  }
}
