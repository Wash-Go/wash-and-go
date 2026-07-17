/*
 * A1 (P1): AUTH_DEV_BYPASS lets the guard trust an `x-dev-uid` header instead
 * of verifying a real Firebase token. That is a DEV-ONLY shim. If it ever
 * reaches production, anyone can impersonate any user. This fail-fast makes the
 * unsafe combination refuse to boot, on top of never shipping the flag to prod.
 */
export function assertAuthConfigSafe(cfg: {
  nodeEnv: string | undefined;
  devBypass: boolean;
}): void {
  if (cfg.nodeEnv === 'production' && cfg.devBypass) {
    throw new Error(
      'AUTH_DEV_BYPASS must never be enabled in production. Refusing to start.',
    );
  }
}
