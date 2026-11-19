import { Module } from '@nestjs/common';
import { DevUsersController } from './dev-users.controller';
import { DevUsersService } from './dev-users.service';

// Imported by AppModule only via devModules() — never in production.
@Module({
  controllers: [DevUsersController],
  providers: [DevUsersService],
})
export class DevUsersModule {}
