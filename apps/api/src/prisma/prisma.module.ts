import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global so repositories in any domain module can inject PrismaService without
// re-importing. Per ADR-003: only repositories touch Prisma for money/state
// domains; whitelisted simple domains may inject it in services directly.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
