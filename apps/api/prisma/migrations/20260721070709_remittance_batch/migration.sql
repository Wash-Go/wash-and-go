-- CreateEnum
CREATE TYPE "RemittanceStatus" AS ENUM ('PENDING', 'PAID');

-- AlterTable
ALTER TABLE "RemittanceLine" ADD COLUMN     "batchId" TEXT;

-- CreateTable
CREATE TABLE "RemittanceBatch" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalPhp" DECIMAL(12,2) NOT NULL,
    "lineCount" INTEGER NOT NULL,
    "status" "RemittanceStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "paidAt" TIMESTAMP(3),
    "paidByUid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemittanceBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RemittanceBatch_shopId_createdAt_idx" ON "RemittanceBatch"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "RemittanceBatch_status_idx" ON "RemittanceBatch"("status");

-- CreateIndex
CREATE INDEX "RemittanceLine_batchId_idx" ON "RemittanceLine"("batchId");

-- CreateIndex
CREATE INDEX "RemittanceLine_shopId_batchId_idx" ON "RemittanceLine"("shopId", "batchId");

-- AddForeignKey
ALTER TABLE "RemittanceLine" ADD CONSTRAINT "RemittanceLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RemittanceBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
