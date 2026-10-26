-- Self-serve onboarding wizard (laundry portal B3): owner-entered contact
-- phone, short description, and weekly opening hours. Hours are a JSON array
-- of 7 { day, open, close } entries; its shape is owned by the API DTO
-- (apps/api/src/shops/dto/shop-onboarding.dto.ts). Capacity stays on the
-- existing "expressSlotsPerDay" column.
ALTER TABLE "Shop" ADD COLUMN "contactPhone" VARCHAR(20);
ALTER TABLE "Shop" ADD COLUMN "description" VARCHAR(500);
ALTER TABLE "Shop" ADD COLUMN "hours" JSONB;
