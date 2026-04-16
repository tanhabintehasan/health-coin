import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
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
}
