import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateOnboardingDto } from './dto/shop-onboarding.dto';
import { ShopOnboardingService } from './shop-onboarding.service';

/*
 * Self-serve shop onboarding (checkpoint B2). The laundry portal drives this:
 * start → fill the wizard → submit for review. `start` is any-authenticated (a
 * customer becomes an owner); the rest are ownership-scoped in the service.
 */
@ApiTags('shop-onboarding')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('shop/onboarding')
export class ShopOnboardingController {
  constructor(private readonly onboarding: ShopOnboardingService) {}

  @Get()
  @ApiOperation({ summary: 'The caller’s shop + onboarding status (null if none)' })
  mine(@CurrentUser() user: User) {
    return this.onboarding.mine(user);
  }

  @Post('start')
  @ApiOperation({ summary: 'Become a shop owner + create a DRAFT shop (idempotent)' })
  start(@CurrentUser() user: User) {
    return this.onboarding.start(user);
  }

  @Patch()
  @ApiOperation({ summary: 'Update the draft (details, map location, proof keys)' })
  update(@CurrentUser() user: User, @Body() dto: UpdateOnboardingDto) {
    return this.onboarding.update(user, dto);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit the shop for admin review' })
  submit(@CurrentUser() user: User) {
    return this.onboarding.submit(user);
  }
}
