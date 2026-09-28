-- Rider COD debt cap: max outstanding cash a rider may carry before dispatch pauses.
ALTER TABLE "PlatformConfig" ADD COLUMN "riderCodCapPhp" DECIMAL(12,2) NOT NULL DEFAULT 1500;
