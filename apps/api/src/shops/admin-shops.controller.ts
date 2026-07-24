import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminShopsService } from './admin-shops.service';
import {
  AddShopMemberDto,
  AddShopServiceDto,
  CreateShopDto,
  UpdateShopDto,
  UpdateShopServiceDto,
} from './dto/admin-shops.dto';

/*
 * Shop administration (checkpoint C). ADMIN-only CRUD over shops, their priced
 * services, and staff — the code side of shop onboarding. Sits apart from the
 * customer-facing GET /shops (which hides margin fields).
 */
@ApiTags('admin-shops')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('admin/shops')
export class AdminShopsController {
  constructor(private readonly shops: AdminShopsService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all shops (incl. inactive) with margin fields' })
  list() {
    return this.shops.list();
  }

  @Get('catalog')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List the service catalog (to attach to a shop)' })
  catalog() {
    return this.shops.listCatalog();
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'One shop with its services + staff' })
  get(@Param('id') id: string) {
    return this.shops.get(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a shop' })
  create(@Body() dto: CreateShopDto) {
    return this.shops.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a shop (details, margin, active)' })
  update(@Param('id') id: string, @Body() dto: UpdateShopDto) {
    return this.shops.update(id, dto);
  }

  @Post(':id/services')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Attach a priced service to a shop' })
  addService(@Param('id') id: string, @Body() dto: AddShopServiceDto) {
    return this.shops.addService(id, dto);
  }

  @Patch(':id/services/:shopServiceId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a shop service (rate, turnaround, active)' })
  updateService(
    @Param('id') id: string,
    @Param('shopServiceId') shopServiceId: string,
    @Body() dto: UpdateShopServiceDto,
  ) {
    return this.shops.updateService(id, shopServiceId, dto);
  }

  @Post(':id/members')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Add a staff member (OWNER / STAFF) to a shop' })
  addMember(@Param('id') id: string, @Body() dto: AddShopMemberDto) {
    return this.shops.addMember(id, dto);
  }

  @Delete(':id/members/:memberId')
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a staff member from a shop' })
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.shops.removeMember(id, memberId);
  }
}
