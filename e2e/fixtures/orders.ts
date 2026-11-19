import { execFileSync } from 'node:child_process';

/*
 * Delete orders a spec seeded (through the API as dev-customer, a protected
 * seeded user whose dev-route cascade can never run) straight in the local DB
 * (E2E_DATABASE_URL, default the design DB the local API runs on). One
 * transaction, children first: payout lines (and any payout batches the spec
 * closed), events, ratings, notifications (a plain orderId column), orders.
 * Cancelling instead would leave a cancelled row behind on every run.
 */
const DB = process.env.E2E_DATABASE_URL ?? 'postgresql://ban@localhost:5432/wash_and_go_design';

const lit = (id: string) => `'${id.replace(/'/g, "''")}'`;

export function psql(q: string): string {
  return execFileSync('psql', [DB, '-v', 'ON_ERROR_STOP=1', '-Atc', q]).toString().trim();
}

export function deleteSeededOrders(orderIds: string[], batchIds: string[] = []): void {
  const orders = orderIds.filter(Boolean).map(lit).join(',');
  const batches = batchIds.filter(Boolean).map(lit).join(',');
  const stmts = [
    ...(orders ? [`DELETE FROM "RemittanceLine" WHERE "orderId" IN (${orders})`] : []),
    ...(batches ? [`DELETE FROM "RemittanceBatch" WHERE id IN (${batches})`] : []),
    ...(orders
      ? [
          `DELETE FROM "OrderEvent" WHERE "orderId" IN (${orders})`,
          `DELETE FROM "Rating" WHERE "orderId" IN (${orders})`,
          `DELETE FROM "Notification" WHERE "orderId" IN (${orders})`,
          `DELETE FROM "Order" WHERE id IN (${orders})`,
        ]
      : []),
  ];
  if (stmts.length) psql(`BEGIN; ${stmts.join('; ')}; COMMIT;`);
}
