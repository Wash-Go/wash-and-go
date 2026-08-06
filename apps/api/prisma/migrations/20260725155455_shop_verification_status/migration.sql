-- Shop verification lifecycle (self-serve onboarding).
CREATE TYPE "ShopStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED');

-- Backfill: every shop that already exists was admin-provisioned + live, so it is
-- VERIFIED. New rows default to DRAFT (self-serve owners start unverified).
ALTER TABLE "Shop" ADD COLUMN "status" "ShopStatus" NOT NULL DEFAULT 'VERIFIED';
ALTER TABLE "Shop" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "Shop" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "Shop" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "Shop" ADD COLUMN "permitKey" TEXT;
ALTER TABLE "Shop" ADD COLUMN "photoKeys" TEXT[] NOT NULL DEFAULT '{}';

-- Flip the default for future rows now that existing ones are backfilled.
ALTER TABLE "Shop" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
