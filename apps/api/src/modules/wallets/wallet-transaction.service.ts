import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletType, TxType } from '@prisma/client';

export interface CreditParams {
  userId: string;
  walletType: WalletType;
  amount: bigint;
  txType: TxType;
  referenceId?: string;
  referenceType?: string;
  appliedRate?: number;
  note?: string;
}

@Injectable()
export class WalletTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async credit(params: CreditParams): Promise<void> {
    if (params.amount <= 0n) throw new BadRequestException('Credit amount must be positive');
    await this.applyTransaction({ ...params });
  }

  async debit(params: CreditParams): Promise<void> {
    if (params.amount <= 0n) throw new BadRequestException('Debit amount must be positive');
    await this.applyTransaction({ ...params, amount: -params.amount });
  }

  private async applyTransaction(params: CreditParams & { amount: bigint }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const wallets = await tx.$queryRaw<{ id: string; balance: bigint }[]>`
        SELECT id, balance FROM wallets
        WHERE user_id = ${params.userId}::uuid
          AND wallet_type = ${params.walletType}::"WalletType"
        FOR UPDATE
      `;

      if (!wallets.length) {
        throw new BadRequestException(`Wallet not found for user ${params.userId}`);
      }

      const wallet = wallets[0];
      const newBalance = wallet.balance + params.amount;

      if (newBalance < 0n) throw new BadRequestException('Insufficient balance');

      await tx.$executeRaw`
        UPDATE wallets SET balance = ${newBalance}, updated_at = NOW()
        WHERE id = ${wallet.id}::uuid
      `;

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: params.userId,
          walletType: params.walletType,
          amount: params.amount,
          balanceAfter: newBalance,
          txType: params.txType,
          referenceId: params.referenceId ?? null,
          referenceType: params.referenceType ?? null,
          appliedRate: params.appliedRate ?? null,
          note: params.note ?? null,
        },
      });
    });
  }
}
