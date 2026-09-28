import {
  Body,
  Controller,
  Get,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateConfigDto } from './dto/update-config.dto';
import { PlatformConfigService } from './platform-config.service';

/*
 * Admin-only editor for platform business rules (ADR-003 thin HTTP layer).
 * Never routine dispatch — this is the "no redeploy to change a fee" surface.
 */
@ApiTags('admin-config')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('admin/config')
export class PlatformConfigController {
  constructor(private readonly config: PlatformConfigService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Read the platform business rules' })
  get() {
    return this.config.getRaw();
  }

  @Put()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update platform business rules (audited)' })
  update(@CurrentUser() user: User, @Body() dto: UpdateConfigDto) {
    return this.config.update({ ...dto }, user.firebaseUid);
  }

  @Get('audit')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Recent config changes (who/when/old→new)' })
  audit(@Query('limit') limit?: string) {
    return this.config.getAudit(limit ? Number(limit) : undefined);
  }
}
