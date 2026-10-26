import 'reflect-metadata';
import { loadApiEnv } from './env';
import { demoUids } from './firebase-accounts';
import { printSummary } from './seed';
import { demoConfig, resetAllowed } from '../../src/demo/demo-config';
import { bootDemo, resetDemo } from '../../src/demo/demo-seed';

// pnpm --filter @wash-and-go/api demo:reset — deletes demo-marked rows only, re-seeds.
async function main() {
  loadApiEnv();
  if (!resetAllowed(process.env)) {
    console.error(
      'Refusing to reset with NODE_ENV=production. Re-run with DEMO_RESET_CONFIRM=yes.',
    );
    process.exit(1);
  }
  const cfg = demoConfig(process.env);
  // Never re-passwords on reset; only creates a demo account that went missing.
  const { uids, generatedPassword: generated } = await demoUids(cfg, process.env, {
    allowPasswordReset: false,
  });
  const { app, deps } = await bootDemo();
  try {
    const { before, after, summary } = await resetDemo(deps, cfg, uids);
    console.log('Before:', before);
    console.log('After: ', after);
    printSummary(summary);
  } finally {
    await app.close();
  }
  if (generated) {
    console.warn(
      '\nWARNING: a missing demo account was re-created with a generated password, shown ONCE. ' +
        `Store it in 1Password now:\n  ${generated}\n`,
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
