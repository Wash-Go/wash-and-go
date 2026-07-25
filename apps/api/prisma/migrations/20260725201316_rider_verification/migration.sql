-- Rider verification lifecycle (self-serve onboarding).
CREATE TYPE "RiderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED');

CREATE TABLE "RiderProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "RiderStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "licenseKey" TEXT,
  "idKey" TEXT,
  "vehicleType" TEXT,
  "vehiclePlate" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiderProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RiderProfile_userId_key" ON "RiderProfile"("userId");
ALTER TABLE "RiderProfile" ADD CONSTRAINT "RiderProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
