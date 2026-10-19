-- One-time cleanup of orders the browser smokes left in the local design DB.
-- Only CANCELLED orders whose pickup address carries the seed helpers' "E2E"
-- marker (e2e/lib/seed.ts: 'E2E pickup, Tetuan', 'E2E dispatch pickup',
-- 'E2E COD pickup'); nothing from apps/api/prisma/seed.ts matches.
-- Run: psql "$E2E_DATABASE_URL" -v ON_ERROR_STOP=1 -f e2e/scripts/cleanup-e2e-orders.sql
-- Deletes children first (FK order); everything in one transaction.
BEGIN;

CREATE TEMP TABLE e2e_orders ON COMMIT DROP AS
  SELECT id FROM "Order" WHERE status = 'CANCELLED' AND "pickupAddress" LIKE 'E2E %';

SELECT 'orders to delete' AS what, count(*) FROM e2e_orders
UNION ALL SELECT 'remittance lines', count(*) FROM "RemittanceLine" WHERE "orderId" IN (SELECT id FROM e2e_orders)
UNION ALL SELECT 'order events', count(*) FROM "OrderEvent" WHERE "orderId" IN (SELECT id FROM e2e_orders)
UNION ALL SELECT 'ratings', count(*) FROM "Rating" WHERE "orderId" IN (SELECT id FROM e2e_orders)
UNION ALL SELECT 'notifications', count(*) FROM "Notification" WHERE "orderId" IN (SELECT id FROM e2e_orders);

DELETE FROM "RemittanceLine" WHERE "orderId" IN (SELECT id FROM e2e_orders);
DELETE FROM "OrderEvent" WHERE "orderId" IN (SELECT id FROM e2e_orders);
DELETE FROM "Rating" WHERE "orderId" IN (SELECT id FROM e2e_orders);
DELETE FROM "Notification" WHERE "orderId" IN (SELECT id FROM e2e_orders);
DELETE FROM "Order" WHERE id IN (SELECT id FROM e2e_orders);

COMMIT;
