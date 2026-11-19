import { existsSync } from 'fs';
import { join } from 'path';
import { apiRoot } from '../../src/auth/credentials-path';

// Load apps/api/.env like the API does (values already in the shell win), so
// `pnpm demo:*` sees the same DATABASE_URL / credentials as `pnpm start`.
// Node's built-in loader; no dependency.
export function loadApiEnv(): void {
  const file = join(apiRoot(), '.env');
  if (existsSync(file)) process.loadEnvFile(file);
}
