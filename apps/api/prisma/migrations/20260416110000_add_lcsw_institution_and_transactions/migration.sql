-- CreateTable
CREATE TABLE "lcsw_institution_configs" (
    "id" TEXT NOT NULL,
    "instNo" VARCHAR(50) NOT NULL,
    "instKey" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "environment" VARCHAR(10) NOT NULL DEFAULT 'test',
    "autoCreateSubMerchants" BOOLEAN NOT NULL DEFAULT false,
    "defaultRateCode" VARCHAR(20) NOT NULL DEFAULT 'M0060',
    "defaultSettlementType" VARCHAR(10) NOT NULL DEFAULT 'D1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lcsw_institution_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_lcsw_accounts" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "lcswMerchantNo" VARCHAR(50) NOT NULL,
    "lcswTerminalId" VARCHAR(50) NOT NULL,
    "lcswAccessToken" TEXT NOT NULL,
    "lcswTraceId" VARCHAR(50),
    "lcswStatus" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "auditMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_lcsw_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "merchant_lcsw_accounts_merchantId_key" ON "merchant_lcsw_accounts"("merchantId");

-- AddForeignKey
ALTER TABLE "merchant_lcsw_accounts" ADD CONSTRAINT "merchant_lcsw_accounts_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_orderId_key" ON "payment_transactions"("orderId");

-- CreateIndex
CREATE INDEX "payment_transactions_provider_idx" ON "payment_transactions"("provider");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE INDEX "payment_transactions_lcswMerchantNo_idx" ON "payment_transactions"("lcswMerchantNo");

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
