-- =====================================================
-- HealthCoin Full PostgreSQL Schema
-- Generated from apps/api/prisma/schema.prisma
-- Run this in Supabase SQL Editor (New query → Run)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallettype') THEN
    CREATE TYPE "WalletType" AS ENUM ('HEALTH_COIN', 'MUTUAL_HEALTH_COIN', 'UNIVERSAL_HEALTH_COIN');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'txtype') THEN
    CREATE TYPE "TxType" AS ENUM ('ORDER_REWARD', 'REFERRAL_L1_REWARD', 'REFERRAL_L2_REWARD', 'REGIONAL_REWARD', 'ORDER_PAYMENT', 'WITHDRAWAL', 'REFUND', 'ADMIN_ADJUSTMENT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchantstatus') THEN
    CREATE TYPE "MerchantStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'producttype') THEN
    CREATE TYPE "ProductType" AS ENUM ('PHYSICAL', 'SERVICE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deliverytype') THEN
    CREATE TYPE "DeliveryType" AS ENUM ('DELIVERY', 'IN_STORE_REDEMPTION');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'productstatus') THEN
    CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'INACTIVE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orderstatus') THEN
    CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'REFUNDING', 'REFUNDED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payoutmethod') THEN
    CREATE TYPE "PayoutMethod" AS ENUM ('BANK', 'ALIPAY', 'WECHAT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawalstatus') THEN
    CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'adminrole') THEN
    CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'FINANCE', 'STAFF');
  END IF;
END $$;

-- =====================================================
-- TABLES (in dependency order)
-- =====================================================

CREATE TABLE IF NOT EXISTS "regions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "code" VARCHAR(20) NOT NULL UNIQUE,
  "level" SMALLINT NOT NULL,
  "parentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "regions_parentId_idx" ON "regions"("parentId");
CREATE INDEX IF NOT EXISTS "regions_level_idx" ON "regions"("level");
ALTER TABLE "regions" DROP CONSTRAINT IF EXISTS "regions_parentId_fkey";
ALTER TABLE "regions" ADD CONSTRAINT "regions_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "membership_tiers" (
  "level" SMALLINT PRIMARY KEY,
  "name" VARCHAR(50) NOT NULL,
  "minCoins" BIGINT NOT NULL DEFAULT 0,
  "regionalCoinRate" DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
  "description" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "system_configs" (
  "key" VARCHAR(100) PRIMARY KEY,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "product_categories" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "parentId" TEXT,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "iconUrl" TEXT
);
CREATE INDEX IF NOT EXISTS "product_categories_parentId_idx" ON "product_categories"("parentId");
ALTER TABLE "product_categories" DROP CONSTRAINT IF EXISTS "product_categories_parentId_fkey";
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "lcsw_institution_configs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "instNo" VARCHAR(50) NOT NULL,
  "instKey" TEXT NOT NULL,
  "baseUrl" TEXT NOT NULL,
  "environment" VARCHAR(10) NOT NULL DEFAULT 'test',
  "autoCreateSubMerchants" BOOLEAN NOT NULL DEFAULT false,
  "defaultRateCode" VARCHAR(20) NOT NULL DEFAULT 'M0060',
  "defaultSettlementType" VARCHAR(10) NOT NULL DEFAULT 'D1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "phone" VARCHAR(20) NOT NULL UNIQUE,
  "nickname" VARCHAR(100),
  "avatarUrl" TEXT,
  "referralCode" VARCHAR(12) NOT NULL UNIQUE,
  "referrerId" TEXT,
  "regionId" TEXT,
  "membershipLevel" SMALLINT NOT NULL DEFAULT 1,
  "totalMutualCoinsEarned" BIGINT NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "wechatOpenId" VARCHAR(100) UNIQUE,
  "alipayUserId" VARCHAR(100) UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users"("phone");
CREATE INDEX IF NOT EXISTS "users_referrerId_idx" ON "users"("referrerId");
CREATE INDEX IF NOT EXISTS "users_regionId_idx" ON "users"("regionId");
CREATE INDEX IF NOT EXISTS "users_referralCode_idx" ON "users"("referralCode");
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_referrerId_fkey";
ALTER TABLE "users" ADD CONSTRAINT "users_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_regionId_fkey";
ALTER TABLE "users" ADD CONSTRAINT "users_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "health_records" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileType" VARCHAR(10) NOT NULL,
  "fileName" VARCHAR(200) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "health_records_userId_idx" ON "health_records"("userId");
ALTER TABLE "health_records" DROP CONSTRAINT IF EXISTS "health_records_userId_fkey";
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "merchants" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerUserId" TEXT NOT NULL UNIQUE,
  "name" VARCHAR(200) NOT NULL,
  "logoUrl" TEXT,
  "description" TEXT,
  "regionId" TEXT,
  "status" MerchantStatus NOT NULL DEFAULT 'PENDING',
  "rejectionNote" TEXT,
  "commissionRate" DECIMAL(5,4) NOT NULL DEFAULT 0.0500,
  "bankAccount" JSONB,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "merchants_ownerUserId_idx" ON "merchants"("ownerUserId");
CREATE INDEX IF NOT EXISTS "merchants_status_idx" ON "merchants"("status");
ALTER TABLE "merchants" DROP CONSTRAINT IF EXISTS "merchants_ownerUserId_fkey";
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "merchants" DROP CONSTRAINT IF EXISTS "merchants_regionId_fkey";
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "wallets" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "walletType" WalletType NOT NULL,
  "balance" BIGINT NOT NULL DEFAULT 0,
  "frozenBalance" BIGINT NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "wallets_userId_idx" ON "wallets"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "wallets_userId_walletType_key" ON "wallets"("userId", "walletType");
ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallets_userId_fkey";
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "products" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "merchantId" TEXT NOT NULL,
  "categoryId" TEXT,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "images" TEXT[] DEFAULT '{}',
  "productType" ProductType NOT NULL,
  "deliveryType" DeliveryType NOT NULL DEFAULT 'DELIVERY',
  "basePrice" BIGINT NOT NULL,
  "coinOffsetRate" DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
  "status" ProductStatus NOT NULL DEFAULT 'DRAFT',
  "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
  "validityDays" INT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "products_merchantId_idx" ON "products"("merchantId");
CREATE INDEX IF NOT EXISTS "products_categoryId_idx" ON "products"("categoryId");
CREATE INDEX IF NOT EXISTS "products_status_idx" ON "products"("status");
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_merchantId_fkey";
ALTER TABLE "products" ADD CONSTRAINT "products_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_categoryId_fkey";
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" TEXT NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "sku" VARCHAR(100),
  "price" BIGINT NOT NULL,
  "stock" INT NOT NULL DEFAULT 0,
  "attributes" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "product_variants_productId_idx" ON "product_variants"("productId");
ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "product_variants_productId_fkey";
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "orders" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderNo" VARCHAR(30) NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "status" OrderStatus NOT NULL DEFAULT 'PENDING_PAYMENT',
  "totalAmount" BIGINT NOT NULL DEFAULT 0,
  "healthCoinPaid" BIGINT NOT NULL DEFAULT 0,
  "mutualCoinPaid" BIGINT NOT NULL DEFAULT 0,
  "universalCoinPaid" BIGINT NOT NULL DEFAULT 0,
  "cashPaid" BIGINT NOT NULL DEFAULT 0,
  "fuiouTradeNo" VARCHAR(100),
  "lcswTradeNo" VARCHAR(100),
  "shippingAddress" JSONB,
  "trackingNumber" VARCHAR(100),
  "remark" TEXT,
  "paidAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "orders_userId_idx" ON "orders"("userId");
CREATE INDEX IF NOT EXISTS "orders_merchantId_idx" ON "orders"("merchantId");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");
CREATE INDEX IF NOT EXISTS "orders_orderNo_idx" ON "orders"("orderNo");
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_userId_fkey";
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_merchantId_fkey";
ALTER TABLE "orders" ADD CONSTRAINT "orders_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "productType" ProductType NOT NULL,
  "productName" VARCHAR(200) NOT NULL,
  "variantName" VARCHAR(200),
  "unitPrice" BIGINT NOT NULL,
  "quantity" INT NOT NULL,
  "subtotal" BIGINT NOT NULL,
  "redemptionCode" VARCHAR(20) UNIQUE,
  "redemptionQrUrl" TEXT,
  "redeemableCount" INT,
  "redeemedCount" INT NOT NULL DEFAULT 0,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "order_items_orderId_idx" ON "order_items"("orderId");
CREATE INDEX IF NOT EXISTS "order_items_redemptionCode_idx" ON "order_items"("redemptionCode");
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_orderId_fkey";
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_productId_fkey";
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_variantId_fkey";
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "wallet_transactions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "walletId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "walletType" WalletType NOT NULL,
  "amount" BIGINT NOT NULL,
  "balanceAfter" BIGINT NOT NULL,
  "txType" TxType NOT NULL,
  "referenceId" UUID,
  "referenceType" VARCHAR(50),
  "appliedRate" DECIMAL(6,4),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "wallet_transactions_walletId_idx" ON "wallet_transactions"("walletId");
CREATE INDEX IF NOT EXISTS "wallet_transactions_userId_idx" ON "wallet_transactions"("userId");
CREATE INDEX IF NOT EXISTS "wallet_transactions_referenceId_referenceType_idx" ON "wallet_transactions"("referenceId", "referenceType");
CREATE INDEX IF NOT EXISTS "wallet_transactions_createdAt_idx" ON "wallet_transactions"("createdAt" DESC);
ALTER TABLE "wallet_transactions" DROP CONSTRAINT IF EXISTS "wallet_transactions_walletId_fkey";
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" DROP CONSTRAINT IF EXISTS "wallet_transactions_userId_fkey";
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "redemption_logs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderItemId" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "redeemedQty" INT NOT NULL DEFAULT 1,
  "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT
);
CREATE INDEX IF NOT EXISTS "redemption_logs_orderItemId_idx" ON "redemption_logs"("orderItemId");
CREATE INDEX IF NOT EXISTS "redemption_logs_merchantId_idx" ON "redemption_logs"("merchantId");
CREATE INDEX IF NOT EXISTS "redemption_logs_redeemedAt_idx" ON "redemption_logs"("redeemedAt" DESC);
ALTER TABLE "redemption_logs" DROP CONSTRAINT IF EXISTS "redemption_logs_orderItemId_fkey";
ALTER TABLE "redemption_logs" ADD CONSTRAINT "redemption_logs_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "redemption_logs" DROP CONSTRAINT IF EXISTS "redemption_logs_merchantId_fkey";
ALTER TABLE "redemption_logs" ADD CONSTRAINT "redemption_logs_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "admin_users" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL UNIQUE,
  "role" AdminRole NOT NULL DEFAULT 'STAFF',
  "permissions" TEXT[] NOT NULL DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "admin_users" DROP CONSTRAINT IF EXISTS "admin_users_userId_fkey";
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "withdrawals" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "commissionRate" DECIMAL(5,4) NOT NULL,
  "commissionAmt" BIGINT NOT NULL,
  "netAmount" BIGINT NOT NULL,
  "payoutMethod" PayoutMethod NOT NULL,
  "payoutAccount" JSONB NOT NULL,
  "status" WithdrawalStatus NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "fuiouBatchNo" VARCHAR(100),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "withdrawals_userId_idx" ON "withdrawals"("userId");
CREATE INDEX IF NOT EXISTS "withdrawals_status_idx" ON "withdrawals"("status");
ALTER TABLE "withdrawals" DROP CONSTRAINT IF EXISTS "withdrawals_userId_fkey";
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "withdrawals" DROP CONSTRAINT IF EXISTS "withdrawals_reviewedBy_fkey";
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "merchant_lcsw_accounts" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "merchantId" TEXT NOT NULL UNIQUE,
  "lcswMerchantNo" VARCHAR(50) NOT NULL,
  "lcswTerminalId" VARCHAR(50) NOT NULL,
  "lcswAccessToken" TEXT NOT NULL,
  "lcswTraceId" VARCHAR(50),
  "lcswStatus" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "auditMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "merchant_lcsw_accounts" DROP CONSTRAINT IF EXISTS "merchant_lcsw_accounts_merchantId_fkey";
ALTER TABLE "merchant_lcsw_accounts" ADD CONSTRAINT "merchant_lcsw_accounts_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" TEXT NOT NULL UNIQUE,
  "provider" VARCHAR(20) NOT NULL,
  "providerTradeNo" VARCHAR(100),
  "amount" BIGINT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "platformCommissionRate" DECIMAL(5,4) NOT NULL,
  "platformCommissionAmt" BIGINT NOT NULL,
  "merchantNetAmount" BIGINT NOT NULL,
  "lcswMerchantNo" VARCHAR(50),
  "lcswTerminalId" VARCHAR(50),
  "webhookPayload" JSONB,
  "webhookReceivedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "payment_transactions_provider_idx" ON "payment_transactions"("provider");
CREATE INDEX IF NOT EXISTS "payment_transactions_status_idx" ON "payment_transactions"("status");
CREATE INDEX IF NOT EXISTS "payment_transactions_lcswMerchantNo_idx" ON "payment_transactions"("lcswMerchantNo");
ALTER TABLE "payment_transactions" DROP CONSTRAINT IF EXISTS "payment_transactions_orderId_fkey";
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "otp_codes" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "phone" VARCHAR(20) NOT NULL,
  "code" VARCHAR(10) NOT NULL,
  "purpose" VARCHAR(20) NOT NULL DEFAULT 'login',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "otp_codes_phone_createdAt_idx" ON "otp_codes"("phone", "createdAt");
CREATE INDEX IF NOT EXISTS "otp_codes_expiresAt_idx" ON "otp_codes"("expiresAt");

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
CREATE INDEX IF NOT EXISTS "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

CREATE TABLE IF NOT EXISTS "cart_items" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "quantity" INT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "cart_items_userId_productId_variantId_key" ON "cart_items"("userId", "productId", "variantId");
CREATE INDEX IF NOT EXISTS "cart_items_userId_idx" ON "cart_items"("userId");

CREATE TABLE IF NOT EXISTS "user_addresses" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "name" VARCHAR(50) NOT NULL,
  "phone" VARCHAR(20) NOT NULL,
  "province" VARCHAR(50) NOT NULL,
  "city" VARCHAR(50) NOT NULL,
  "district" VARCHAR(50) NOT NULL,
  "detail" VARCHAR(200) NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "user_addresses_userId_idx" ON "user_addresses"("userId");
