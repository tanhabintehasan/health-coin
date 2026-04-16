import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.ensureTables();
    try {
      const count = await this.otpCode.count();
      this.logger.log(`[DB DIAGNOSTIC] otp_codes table is accessible. Current rows: ${count}`);
    } catch (err: any) {
      this.logger.error(`[DB DIAGNOSTIC] otp_codes table is NOT accessible: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async ensureTables() {
    const tables = [
      {
        name: 'otp_codes',
        sql: `
          CREATE TABLE IF NOT EXISTS "otp_codes" (
            "id" TEXT NOT NULL,
            "phone" VARCHAR(20) NOT NULL,
            "code" VARCHAR(10) NOT NULL,
            "purpose" VARCHAR(20) NOT NULL DEFAULT 'login',
            "expiresAt" TIMESTAMP(3) NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
          );
          CREATE INDEX IF NOT EXISTS "otp_codes_phone_createdAt_idx" ON "otp_codes"("phone", "createdAt");
          CREATE INDEX IF NOT EXISTS "otp_codes_expiresAt_idx" ON "otp_codes"("expiresAt");
        `,
      },
      {
        name: 'refresh_tokens',
        sql: `
          CREATE TABLE IF NOT EXISTS "refresh_tokens" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "token" TEXT NOT NULL,
            "expiresAt" TIMESTAMP(3) NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
          );
          CREATE INDEX IF NOT EXISTS "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
          CREATE INDEX IF NOT EXISTS "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");
        `,
      },
      {
        name: 'cart_items',
        sql: `
          CREATE TABLE IF NOT EXISTS "cart_items" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "productId" TEXT NOT NULL,
            "variantId" TEXT NOT NULL,
            "quantity" INTEGER NOT NULL DEFAULT 1,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
          );
          CREATE UNIQUE INDEX IF NOT EXISTS "cart_items_userId_productId_variantId_key" ON "cart_items"("userId", "productId", "variantId");
          CREATE INDEX IF NOT EXISTS "cart_items_userId_idx" ON "cart_items"("userId");
        `,
      },
    ];

    for (const { name, sql } of tables) {
      try {
        await this.$queryRawUnsafe(`SELECT 1 FROM "${name}" LIMIT 1`);
        this.logger.log(`[DB HEALING] Table "${name}" exists.`);
      } catch {
        this.logger.warn(`[DB HEALING] Table "${name}" missing. Creating now...`);
        try {
          await this.$executeRawUnsafe(sql);
          this.logger.log(`[DB HEALING] Table "${name}" created successfully.`);
        } catch (createErr: any) {
          this.logger.error(`[DB HEALING] Failed to create table "${name}": ${createErr.message}`);
        }
      }
    }
  }
}
