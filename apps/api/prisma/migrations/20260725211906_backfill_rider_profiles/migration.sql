-- Backfill: any pre-existing RIDER user without a profile was admin-provisioned
-- and trusted, so give them a VERIFIED profile — otherwise the onboarding-D
-- dispatch gate (riderProfile status VERIFIED) would make them permanently
-- undispatchable. Idempotent (NOT EXISTS); a no-op on a DB with no such users.
INSERT INTO "RiderProfile" ("id", "userId", "status", "verifiedAt", "createdAt")
SELECT gen_random_uuid()::text, u."id", 'VERIFIED', now(), now()
FROM "User" u
WHERE 'RIDER' = ANY(u."roles")
  AND NOT EXISTS (SELECT 1 FROM "RiderProfile" p WHERE p."userId" = u."id");
