import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PresignUploadDto } from './dto/uploads.dto';
import { UploadsService } from './uploads.service';

/*
 * Direct-to-R2 upload brokering (onboarding B1). Any authenticated user can mint
 * a presigned PUT for their own object; viewing is gated to the owner or an ADMIN
 * inside the service. No @Roles — ownership is enforced by the key namespace.
 */
@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('presign')
  @ApiOperation({ summary: 'Presigned PUT to upload a file directly to R2' })
  presign(@CurrentUser() user: User, @Body() dto: PresignUploadDto) {
    return this.uploads.presignUpload(user.id, dto.contentType);
  }

  @Get('url')
  @ApiOperation({ summary: 'Presigned GET to view a private object (owner or admin)' })
  view(@CurrentUser() user: User, @Query('key') key?: string) {
    const k = (key ?? '').trim();
    if (!k) throw new BadRequestException('key is required');
    return this.uploads.presignView(k, { id: user.id, roles: user.roles });
  }
}
