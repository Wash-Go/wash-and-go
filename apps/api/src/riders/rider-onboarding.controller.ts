import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateRiderOnboardingDto } from './dto/rider-onboarding.dto';
import { RiderOnboardingService } from './rider-onboarding.service';

/*
 * Self-serve rider onboarding (checkpoint D). The rider app drives this: start →
 * submit documents → await admin verification. `start` is any-authenticated;
 * the rest are ownership-scoped in the service.
 */
@ApiTags('rider-onboarding')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('rider/onboarding')
export class RiderOnboardingController {
  constructor(private readonly onboarding: RiderOnboardingService) {}

  @Get()
  @ApiOperation({ summary: 'The caller’s rider profile + status (null if none)' })
  mine(@CurrentUser() user: User) {
    return this.onboarding.mine(user);
  }

  @Post('start')
  @ApiOperation({ summary: 'Become a rider + create a DRAFT profile (idempotent)' })
  start(@CurrentUser() user: User) {
    return this.onboarding.start(user);
  }

  @Patch()
  @ApiOperation({ summary: 'Update the draft (documents + vehicle)' })
  update(@CurrentUser() user: User, @Body() dto: UpdateRiderOnboardingDto) {
    return this.onboarding.update(user, dto);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit for admin verification' })
  submit(@CurrentUser() user: User) {
    return this.onboarding.submit(user);
  }
}
