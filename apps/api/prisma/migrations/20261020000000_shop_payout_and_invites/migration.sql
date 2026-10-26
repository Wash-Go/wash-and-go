-- Shop self-management (laundry portal B4): payout account, staff invites,
-- member join dates, and the verified sign-in email invites are matched on.

-- Payout account. Founder policy (GCash vs bank) is pending: both supported,
-- none mandatory. The number is stored in full and only returned masked.
CREATE TYPE "PayoutMethod" AS ENUM ('GCASH', 'BANK');

ALTER TABLE "Shop" ADD COLUMN "payoutMethod" "PayoutMethod",
ADD COLUMN "payoutAccountName" VARCHAR(120),
ADD COLUMN "payoutAccountNumber" VARCHAR(40),
ADD COLUMN "payoutBankName" VARCHAR(120),
ADD COLUMN "payoutUpdatedAt" TIMESTAMP(3);

-- Member join date for GET /shop/members. Existing rows take the migration time.
ALTER TABLE "ShopMember" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Lowercased email from a VERIFIED Firebase token, written on POST /auth/session.
ALTER TABLE "User" ADD COLUMN "email" VARCHAR(254);
ALTER TABLE "User" ADD CONSTRAINT "User_email_lowercase" CHECK ("email" = lower("email"));
CREATE INDEX "User_email_idx" ON "User"("email");

-- Staff invites. One row per (shop, email); a re-invite reopens the row.
CREATE TABLE "ShopInvite" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "invitedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "acceptedUserId" TEXT,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ShopInvite_pkey" PRIMARY KEY ("id"),
    -- Matching is exact on the lowercased form; refuse anything else.
    CONSTRAINT "ShopInvite_email_lowercase" CHECK ("email" = lower("email")),
    CONSTRAINT "ShopInvite_role_staff" CHECK ("role" = 'STAFF')
);

CREATE UNIQUE INDEX "ShopInvite_shopId_email_key" ON "ShopInvite"("shopId", "email");
CREATE INDEX "ShopInvite_email_idx" ON "ShopInvite"("email");

ALTER TABLE "ShopInvite" ADD CONSTRAINT "ShopInvite_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopInvite" ADD CONSTRAINT "ShopInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopInvite" ADD CONSTRAINT "ShopInvite_acceptedUserId_fkey" FOREIGN KEY ("acceptedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
