-- Idempotency keys: retried booking / deposit returns the existing row.
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

ALTER TABLE "RiderCashDeposit" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "RiderCashDeposit_idempotencyKey_key" ON "RiderCashDeposit"("idempotencyKey");
