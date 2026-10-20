-- Shop identity in the portal header (B8): the owner's uploaded logo, an R2
-- object key under the owner's uploads/<userId>/ prefix. Served only as a
-- short-lived presigned GET; null = show the Wash & Go mark alone.
ALTER TABLE "Shop" ADD COLUMN "logoKey" VARCHAR(300);
