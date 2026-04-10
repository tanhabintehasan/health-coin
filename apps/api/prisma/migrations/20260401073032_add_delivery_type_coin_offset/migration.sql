-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('DELIVERY', 'IN_STORE_REDEMPTION');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "coinOffsetRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryType" "DeliveryType" NOT NULL DEFAULT 'DELIVERY';
