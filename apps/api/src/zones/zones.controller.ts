import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { parseFiniteNumber } from '../common/parse-num';
import { CreateZoneDto, SetZoneActiveDto } from './dto/zones.dto';
import { ZonesService } from './zones.service';

/*
 * Zone administration (ADR-003 thin HTTP layer). Ops draws/toggles coverage
 * zones; resolve answers "which zone is this point in" for coverage checks.
 */
@ApiTags('admin-zones')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('admin/zones')
export class ZonesController {
  constructor(private readonly zones: ZonesService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List coverage zones' })
  list() {
    return this.zones.list();
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a coverage zone' })
  create(@Body() dto: CreateZoneDto) {
    return this.zones.create(dto.name, dto.polygon);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Activate / deactivate a zone' })
  setActive(@Param('id') id: string, @Body() dto: SetZoneActiveDto) {
    return this.zones.setActive(id, dto.active);
  }

  @Get('resolve')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Which zone contains a point (or null)' })
  resolve(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.zones.resolve({
      lat: parseFiniteNumber(lat, 'lat'),
      lng: parseFiniteNumber(lng, 'lng'),
    });
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a zone' })
  remove(@Param('id') id: string) {
    return this.zones.remove(id);
  }
}
