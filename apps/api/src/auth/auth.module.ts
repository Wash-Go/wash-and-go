import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../users/users.module';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { FirebaseAuthGuard } from './firebase-auth.guard';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    FirebaseService,
    AuthService,
    // Secure-by-default (debate D3): every route guarded unless @Public.
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
