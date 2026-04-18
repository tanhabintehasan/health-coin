-- Add rewardProcessedAt for idempotent coin reward processing
ALTER TABLE "orders" ADD COLUMN "rewardProcessedAt" TIMESTAMP(3);

-- Add documents JSON field for merchant KYC uploads
ALTER TABLE "merchants" ADD COLUMN "documents" JSONB;

-- Expand redemptionCode length to accommodate nanoid(10)
ALTER TABLE "order_items" ALTER COLUMN "redemptionCode" TYPE VARCHAR(32);
