import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RidersService } from './riders.service';

@ApiTags('riders')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('riders')
export class RidersController {
  constructor(private readonly riders: RidersService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List riders (admin — for dispatch assign)' })
  list() {
    return this.riders.listRiders();
  }
}
