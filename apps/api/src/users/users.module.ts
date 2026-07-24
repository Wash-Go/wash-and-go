import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { AddressRepository } from './address.repository';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminUsersController } from './admin-users.controller';

@Module({
  controllers: [AddressController, AdminUsersController],
  providers: [UsersRepository, AddressRepository, AddressService, AdminUsersService],
  exports: [UsersRepository],
})
export class UsersModule {}
