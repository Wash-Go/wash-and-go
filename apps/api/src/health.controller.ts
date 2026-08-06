import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './auth/public.decorator';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Liveness — process is up. Cheap, no dependencies.
  @Public()
  @Get()
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  // A5: Readiness — checks the DB so a load balancer stops routing to an
  // instance whose Postgres is down instead of seeing a false 'ok'.
  @Public()
  @Get('ready')
  async ready(): Promise<{ status: 'ok'; db: 'up' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: 'down' });
    }
    return { status: 'ok', db: 'up' };
  }
}
