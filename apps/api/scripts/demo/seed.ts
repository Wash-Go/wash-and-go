import 'reflect-metadata';
import { loadApiEnv } from './env';
import { demoUids } from './firebase-accounts';
import { demoConfig, resetAllowed } from '../../src/demo/demo-config';
import { bootDemo, seedDemo, type SeedSummary } from '../../src/demo/demo-seed';

// pnpm --filter @wash-and-go/api demo:seed — see docs/demo/portal-demo-runbook.md.
export function printSummary(s: SeedSummary): void {
  console.table(
    s.orders.map((o) => ({ label: o.label, code: o.code, status: o.status, type: o.serviceType })),
  );
  console.log(
    `Shop ${s.shopId} · PAID batch ${s.batches.paid.id} (${s.batches.paid.reference}, ${s.batches.paid.lineCount} lines) · ` +
      `PENDING batch ${s.batches.pending.id} (${s.batches.pending.lineCount} lines) · ` +
      `${s.unbatchedLines} unbatched lines · rider deposit ₱${s.depositPhp}`,
  );
  for (const w of s.warnings) console.warn(`WARNING: ${w}`);
  console.log(
    'Portal: <PORTAL_URL>/  ·  Admin: <ADMIN_URL>/  ·  API: ' +
      (process.env.API_URL ?? '<API_URL>'),
  );
}

async function main() {
  loadApiEnv();
  const cfg = demoConfig(process.env);
  const { uids, generatedPassword: generated } = await demoUids(cfg, process.env, {
    allowPasswordReset: true,
  });
  const { app, deps } = await bootDemo();
  try {
    // Production without DEMO_RESET_CONFIRM=yes: a first seed only, never a clear.
    printSummary(
      await seedDemo(deps, cfg, uids, new Date(), { allowClear: resetAllowed(process.env) }),
    );
  } finally {
    await app.close();
  }
  if (generated) {
    console.warn(
      '\nWARNING: generated demo password, shown ONCE. Store it in 1Password now; it is not saved anywhere:\n' +
        `  ${generated}\n`,
    );
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
