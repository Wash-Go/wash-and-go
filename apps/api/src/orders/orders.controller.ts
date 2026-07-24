import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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
  QuoteOrderDto,
  RateOrderDto,
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
  // Read-only price calc, not sensitive to the shop (it's their own order's
  // economics). The laundry portal previews the recomputed total before a
  // weigh-in, so shop roles + admin need it too, not just the customer.
  @Roles('CUSTOMER', 'SHOP_OWNER', 'SHOP_STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Price a prospective order (no write)' })
  preview(@Body() dto: PreviewOrderDto) {
    return this.orders.previewOrder(dto);
  }

  @Post('quote')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Resolve nearest shop (or override) + priced quote' })
  quote(@Body() dto: QuoteOrderDto) {
    return this.orders.quoteOrder(dto);
  }

  @Post()
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Book an order (customer) — Express (default) or Scheduled' })
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return dto.serviceType === 'SCHEDULED'
      ? this.orders.createScheduledOrder(user, dto, idempotencyKey)
      : this.orders.createExpressOrder(user, dto, idempotencyKey);
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
  @Roles('CUSTOMER', 'RIDER', 'SHOP_OWNER', 'SHOP_STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Drive a legal status transition (customer may cancel own order early)' })
  transition(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: TransitionDto,
  ) {
    return this.orders.transition(user, id, dto);
  }

  @Post(':id/rating')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Rate a delivered order (customer, once)' })
  rate(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RateOrderDto,
  ) {
    return this.orders.rateOrder(user, id, dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
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
  @ApiQuery({ name: 'q', required: false, description: 'search by order code' })
  @ApiQuery({ name: 'limit', required: false, description: 'page size (default 50, max 100)' })
  @ApiQuery({ name: 'before', required: false, description: 'order id cursor for the next page' })
  @ApiOperation({ summary: 'List orders visible to the caller (paged, newest first)' })
  list(
    @CurrentUser() user: User,
    @Query('status') status?: OrderStatus,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.orders.listOrders(user, {
      status,
      q,
      limit: limit != null && limit !== '' ? Number(limit) : undefined,
      before: before || undefined,
    });
  }
}
