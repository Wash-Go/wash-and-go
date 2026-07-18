import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { OrderStatus, User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrdersService } from './orders.service';
import {
  AssignRiderDto,
  CreateOrderDto,
  PreviewOrderDto,
  TransitionDto,
  WeighDto,
} from './dto/orders.dto';

/*
 * Thin HTTP layer (ADR-003): no business logic here. The global FirebaseAuthGuard
 * authenticates; RolesGuard enforces the coarse @Roles gate (plan D2 matrix);
 * fine-grained ownership lives in OrdersService.
 */
@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('preview')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Price a prospective order (no write)' })
  preview(@Body() dto: PreviewOrderDto) {
    return this.orders.previewOrder(dto);
  }

  @Post()
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Book an express order (customer)' })
  create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.orders.createExpressOrder(user, dto);
  }

  @Post(':id/assign-rider')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Assign a rider (admin manual dispatch)' })
  assignRider(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AssignRiderDto,
  ) {
    return this.orders.assignRider(user, id, dto);
  }

  @Post(':id/weigh')
  @Roles('SHOP_OWNER', 'SHOP_STAFF')
  @ApiOperation({ summary: 'Weigh in and recompute price (shop)' })
  weigh(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: WeighDto,
  ) {
    return this.orders.weigh(user, id, dto);
  }

  @Post(':id/status')
  @Roles('RIDER', 'SHOP_OWNER', 'SHOP_STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Drive a legal status transition' })
  transition(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: TransitionDto,
  ) {
    return this.orders.transition(user, id, dto);
  }

  @Post(':id/pay-cash')
  @Roles('ADMIN', 'RIDER')
  @ApiOperation({ summary: 'Record a manual cash payment' })
  payCash(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.payCash(user, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one order (ownership-scoped)' })
  getOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.getOrder(user, id);
  }

  @Get()
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiOperation({ summary: 'List orders visible to the caller' })
  list(@CurrentUser() user: User, @Query('status') status?: OrderStatus) {
    return this.orders.listOrders(user, status);
  }
}
