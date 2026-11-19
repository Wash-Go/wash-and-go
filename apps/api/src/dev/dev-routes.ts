import type { Type } from '@nestjs/common';
import { assertAuthConfigSafe } from '../auth/auth-config';
import { DevUsersModule } from './dev-users.module';

/*
 * Dev-only modules AppModule imports. Loaded ONLY when AUTH_DEV_BYPASS=1 in a
 * NODE_ENV the A1 rule allows (development / test): the same switch that
 * already makes x-dev-uid full impersonation. Bypass on anywhere else
 * (production, staging, unset) throws — the app refuses to boot, exactly as
 * FirebaseService.onModuleInit does. With the bypass off nothing is imported,
 * so /dev/* routes don't exist (404) and never reach Swagger.
 */
export function devModules(env: Record<string, string | undefined>): Type[] {
  const devBypass = env.AUTH_DEV_BYPASS === '1';
  assertAuthConfigSafe({ nodeEnv: env.NODE_ENV, devBypass });
  return devBypass && env.NODE_ENV !== 'production' ? [DevUsersModule] : [];
}
