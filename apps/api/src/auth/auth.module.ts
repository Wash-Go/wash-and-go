import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../users/users.module';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    FirebaseService,
    AuthService,
    // Secure-by-default (debate D3): every route guarded unless @Public.
    // Order matters — FirebaseAuthGuard runs first and attaches req.authUser,
    // then RolesGuard reads it. Registering RolesGuard globally (A12) means a
    // controller that forgets @UseGuards(RolesGuard) still gets role-gated; it
    // no-ops on routes with no @Roles.
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
