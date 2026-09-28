/*
 * A1 (P1): AUTH_DEV_BYPASS lets the guard trust an `x-dev-uid` header instead
 * of verifying a real Firebase token. That is a DEV-ONLY shim. If it ever
 * reaches production, anyone can impersonate any user (incl. ADMIN).
 *
 * Fail-SAFE: the bypass is permitted ONLY when NODE_ENV is an explicit dev/test
 * value. Anything else — production, staging, or (the real deploy hole) an unset
 * NODE_ENV — refuses to boot when the bypass is on. This closes the gap where a
 * deploy that never set NODE_ENV would silently keep the bypass live.
 */
const BYPASS_ALLOWED_ENVS = new Set(['development', 'test']);

export function assertAuthConfigSafe(cfg: {
  nodeEnv: string | undefined;
  devBypass: boolean;
}): void {
  if (cfg.devBypass && !BYPASS_ALLOWED_ENVS.has(cfg.nodeEnv ?? '')) {
    throw new Error(
      `AUTH_DEV_BYPASS is only allowed when NODE_ENV is 'development' or 'test' ` +
        `(got ${cfg.nodeEnv ?? 'unset'}). Refusing to start.`,
    );
  }
}
