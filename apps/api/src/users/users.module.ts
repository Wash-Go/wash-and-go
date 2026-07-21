import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { AddressRepository } from './address.repository';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';

@Module({
  controllers: [AddressController],
  providers: [UsersRepository, AddressRepository, AddressService],
  exports: [UsersRepository],
})
export class UsersModule {}
