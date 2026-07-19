-- CreateTable
CREATE TABLE "PlatformConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "serviceFeePhp" DECIMAL(10,2) NOT NULL,
    "deliveryBasePhp" DECIMAL(10,2) NOT NULL,
    "deliveryFreeKm" DECIMAL(6,2) NOT NULL,
    "deliveryPerKmPhp" DECIMAL(10,2) NOT NULL,
    "deliveryMaxPhp" DECIMAL(10,2) NOT NULL,
    "deliveryRoadFactor" DECIMAL(5,3) NOT NULL,
    "maxResolveKm" DECIMAL(6,2) NOT NULL,
    "expressWeightThresholdKg" DECIMAL(6,2) NOT NULL,
    "minOrderPricePhp" DECIMAL(10,2) NOT NULL,
    "platformFeePhp" DECIMAL(10,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigAudit" (
    "id" TEXT NOT NULL,
    "actorUid" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConfigAudit_changedAt_idx" ON "ConfigAudit"("changedAt" DESC);
