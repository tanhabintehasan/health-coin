import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletQueryDto } from './dto/wallet-query.dto';

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalances(userId: string) {
    let wallets = await this.prisma.wallet.findMany({
      where: { userId },
      select: { walletType: true, balance: true, frozenBalance: true },
    });

    // Auto-create missing wallets
    const existingTypes = new Set(wallets.map((w) => w.walletType));
    const allTypes = ['HEALTH_COIN', 'MUTUAL_HEALTH_COIN', 'UNIVERSAL_HEALTH_COIN'] as const;
    const missingTypes = allTypes.filter((t) => !existingTypes.has(t as any));

    if (missingTypes.length > 0) {
      await this.prisma.wallet.createMany({
        data: missingTypes.map((t) => ({ userId, walletType: t as any, balance: 0n })),
        skipDuplicates: true,
      });
      wallets = await this.prisma.wallet.findMany({
        where: { userId },
        select: { walletType: true, balance: true, frozenBalance: true },
      });
    }

    return wallets.map((w) => ({
      type: w.walletType,
      balance: w.balance.toString(),
      frozenBalance: w.frozenBalance.toString(),
      available: (w.balance - w.frozenBalance).toString(),
    }));
  }

  async getTransactions(userId: string, query: WalletQueryDto) {
    const { type, page = 1, limit = 20 } = query;
    const take = Math.min(Math.max(Number(limit), 1), 100);
    const skip = (page - 1) * take;
    const where = { userId, ...(type && { walletType: type }) };

    const [total, transactions] = await Promise.all([
      this.prisma.walletTransaction.count({ where }),
      this.prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          walletType: true,
          amount: true,
          balanceAfter: true,
          txType: true,
          referenceType: true,
          note: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      data: transactions.map((t) => ({
        ...t,
        amount: t.amount.toString(),
        balanceAfter: t.balanceAfter.toString(),
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
