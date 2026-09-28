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
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AddressService } from './address.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

/*
 * Customer address book (ADR-003 thin HTTP layer). Every route is scoped to the
 * authenticated user; the service enforces ownership, so no id from the client
 * can reach another user's row.
 */
@ApiTags('addresses')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('me/addresses')
export class AddressController {
  constructor(private readonly addresses: AddressService) {}

  @Get()
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'List my saved addresses' })
  list(@CurrentUser() user: User) {
    return this.addresses.list(user.id);
  }

  @Post()
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Save an address' })
  create(@CurrentUser() user: User, @Body() dto: CreateAddressDto) {
    return this.addresses.create(user.id, dto);
  }

  @Patch(':id')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Update a saved address' })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addresses.update(user.id, id, dto);
  }

  @Delete(':id')
  @Roles('CUSTOMER')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a saved address' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.addresses.remove(user.id, id);
  }
}
