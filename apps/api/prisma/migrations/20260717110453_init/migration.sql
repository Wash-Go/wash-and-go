-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'RIDER', 'SHOP_OWNER', 'SHOP_STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('SCHEDULED', 'EXPRESS');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('BOOKED', 'ASSIGNED', 'PICKED_UP', 'AT_SHOP', 'PROCESSING', 'READY_FOR_RETURN', 'OUT_FOR_RETURN', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingUnit" AS ENUM ('PER_KG', 'PER_PIECE', 'FLAT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "roles" "UserRole"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabledAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "commissionPct" DECIMAL(5,2) NOT NULL DEFAULT 12.00,
    "expressSlotsPerDay" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopMember" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "ShopMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCatalogItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billingUnit" "BillingUnit" NOT NULL,

    CONSTRAINT "ServiceCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopService" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "ratePhp" DECIMAL(10,2) NOT NULL,
    "turnaroundHours" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ShopService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'BOOKED',
    "pickupAddress" TEXT NOT NULL,
    "pickupLat" DECIMAL(9,6),
    "pickupLng" DECIMAL(9,6),
    "shopId" TEXT,
    "shopServiceId" TEXT,
    "assignedRiderId" TEXT,
    "weightEstimateKg" DECIMAL(6,2),
    "weightKg" DECIMAL(6,2),
    "washValuePhp" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deliveryFeePhp" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "serviceFeePhp" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "commissionPhp" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "shopRemittancePhp" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "customerTotalPhp" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paidCashAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "actorUserId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemittanceLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "washValuePhp" DECIMAL(10,2) NOT NULL,
    "commissionPhp" DECIMAL(10,2) NOT NULL,
    "payoutPhp" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemittanceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "ShopMember_shopId_userId_key" ON "ShopMember"("shopId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCatalogItem_code_key" ON "ServiceCatalogItem"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ShopService_shopId_serviceId_key" ON "ShopService"("shopId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_code_key" ON "Order"("code");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_shopId_status_idx" ON "Order"("shopId", "status");

-- CreateIndex
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RemittanceLine_orderId_key" ON "RemittanceLine"("orderId");

-- CreateIndex
CREATE INDEX "RemittanceLine_shopId_createdAt_idx" ON "RemittanceLine"("shopId", "createdAt");

-- AddForeignKey
ALTER TABLE "ShopMember" ADD CONSTRAINT "ShopMember_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopMember" ADD CONSTRAINT "ShopMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopService" ADD CONSTRAINT "ShopService_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopService" ADD CONSTRAINT "ShopService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shopServiceId_fkey" FOREIGN KEY ("shopServiceId") REFERENCES "ShopService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedRiderId_fkey" FOREIGN KEY ("assignedRiderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemittanceLine" ADD CONSTRAINT "RemittanceLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
