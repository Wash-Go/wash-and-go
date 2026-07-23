-- CreateTable
CREATE TABLE "RiderCashDeposit" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "amountPhp" DECIMAL(12,2) NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "recordedByUid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiderCashDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiderCashDeposit_riderId_createdAt_idx" ON "RiderCashDeposit"("riderId", "createdAt");

-- AddForeignKey
ALTER TABLE "RiderCashDeposit" ADD CONSTRAINT "RiderCashDeposit_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
