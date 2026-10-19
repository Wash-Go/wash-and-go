import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PutShopServiceDto } from './dto/shop-services.dto';
import { ShopServicesService } from './shop-services.service';
import { OwnerShopServiceDoc, ShopCatalogItemDoc } from './dto/shop-views.dto';

/*
 * The caller's own shop services + rates (portal wizard step 3 and the B4
 * services screen). The shop is always derived from the caller's ShopMember
 * row in the service; @Roles is the coarse gate, the OWNER check is there too.
 */
@ApiTags('shop-services')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('shop')
export class ShopServicesController {
  constructor(private readonly services: ShopServicesService) {}

  @Get('catalog')
  @Roles('SHOP_OWNER', 'SHOP_STAFF')
  @ApiOperation({ summary: 'Platform service catalog (what a shop can offer)' })
  @ApiOkResponse({ type: ShopCatalogItemDoc, isArray: true })
  catalog(@CurrentUser() user: User) {
    return this.services.catalog(user.id);
  }

  @Get('services')
  @Roles('SHOP_OWNER', 'SHOP_STAFF')
  @ApiOperation({
    summary: "The caller's shop services with rates and turnaround",
  })
  @ApiOkResponse({ type: OwnerShopServiceDoc, isArray: true })
  list(@CurrentUser() user: User) {
    return this.services.list(user.id);
  }

  @Put('services/:serviceId')
  @Roles('SHOP_OWNER')
  @ApiParam({
    name: 'serviceId',
    description: 'Catalog service id (GET /shop/catalog)',
  })
  @ApiOperation({
    summary: 'Set rate, turnaround and active for one catalog service (owner only)',
  })
  @ApiOkResponse({ type: OwnerShopServiceDoc })
  upsert(
    @CurrentUser() user: User,
    @Param('serviceId') serviceId: string,
    @Body() dto: PutShopServiceDto,
  ) {
    return this.services.upsert(user.id, serviceId, dto);
  }
}
