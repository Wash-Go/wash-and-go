import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Active shops + their active services (catalog)' })
  list() {
    return this.shops.listActiveWithServices();
  }
}
