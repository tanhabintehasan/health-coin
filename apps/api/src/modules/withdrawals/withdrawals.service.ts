import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletTransactionService } from '../wallets/wallet-transaction.service';
import { CreateWithdrawalDto, ReviewWithdrawalDto } from './dto/withdrawal.dto';

@Injectable()
export class WithdrawalsService {
  private readonly logger = new Logger(WithdrawalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletTx: WalletTransactionService,
  ) {}

  async create(userId: string, dto: CreateWithdrawalDto) {
    const amount = BigInt(dto.amount);

    // Check wallet balance
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId, walletType: 'UNIVERSAL_HEALTH_COIN' },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const available = wallet.balance - wallet.frozenBalance;
    if (available < amount) throw new BadRequestException('Insufficient available balance');

    // Load commission rate from config
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'withdrawal_commission_rate' },
    });
    const commissionRate = parseFloat(config?.value ?? '0.05');
    const commissionAmt = BigInt(Math.round(Number(amount) * commissionRate));
    const netAmount = amount - commissionAmt;

    // Freeze funds + create withdrawal record atomically
    const withdrawal = await this.prisma.$transaction(async (tx) => {
      // Freeze the amount
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { frozenBalance: { increment: amount } },
      });

      return tx.withdrawal.create({
        data: {
          userId,
          amount,
          commissionRate,
          commissionAmt,
          netAmount,
          payoutMethod: dto.payoutMethod,
          payoutAccount: dto.payoutAccount as object,
          status: 'PENDING',
        },
      });
    });

    return {
      ...withdrawal,
      amount: withdrawal.amount.toString(),
      commissionAmt: withdrawal.commissionAmt.toString(),
      netAmount: withdrawal.netAmount.toString(),
    };
  }

  async getMyWithdrawals(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { userId };

    const [total, withdrawals] = await Promise.all([
      this.prisma.withdrawal.count({ where }),
      this.prisma.withdrawal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: withdrawals.map((w) => ({
        ...w,
        amount: w.amount.toString(),
        commissionAmt: w.commissionAmt.toString(),
        netAmount: w.netAmount.toString(),
        payoutAccount: w.payoutAccount, // already JSON
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Admin: list all pending withdrawals
  async listPending(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { status: 'PENDING' as const };

    const [total, withdrawals] = await Promise.all([
      this.prisma.withdrawal.count({ where }),
      this.prisma.withdrawal.findMany({
        where,
        include: { user: { select: { id: true, phone: true, nickname: true } } },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: withdrawals.map((w) => ({
        ...w,
        amount: w.amount.toString(),
        commissionAmt: w.commissionAmt.toString(),
        netAmount: w.netAmount.toString(),
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Admin: approve or reject
  async review(adminUserId: string, withdrawalId: string, dto: ReviewWithdrawalDto) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException('Withdrawal is not in PENDING status');
    }

    const adminUser = await this.prisma.adminUser.findUnique({ where: { userId: adminUserId } });
    if (!adminUser) throw new ForbiddenException('Admin access required');

    if (dto.action === 'REJECTED') {
      // Unfreeze funds
      await this.prisma.$transaction(async (tx) => {
        await tx.wallet.updateMany({
          where: { userId: withdrawal.userId, walletType: 'UNIVERSAL_HEALTH_COIN' },
          data: { frozenBalance: { decrement: withdrawal.amount } },
        });

        await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'REJECTED',
            adminNote: dto.adminNote,
            reviewedBy: adminUser.id,
            reviewedAt: new Date(),
          },
        });
      });

      return { status: 'REJECTED' };
    }

    // APPROVED — deduct coins + mark processing
    await this.prisma.$transaction(async (tx) => {
      // Fetch wallet first to compute correct balanceAfter
      const wallet = await tx.wallet.findFirst({
        where: { userId: withdrawal.userId, walletType: 'UNIVERSAL_HEALTH_COIN' },
      });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const newBalance = wallet.balance - withdrawal.amount;

      // Deduct from balance and unfreeze
      await tx.wallet.updateMany({
        where: { userId: withdrawal.userId, walletType: 'UNIVERSAL_HEALTH_COIN' },
        data: {
          balance: { decrement: withdrawal.amount },
          frozenBalance: { decrement: withdrawal.amount },
        },
      });

      // Ledger entry
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: withdrawal.userId,
          walletType: 'UNIVERSAL_HEALTH_COIN',
          amount: -withdrawal.amount,
          balanceAfter: newBalance,
          txType: 'WITHDRAWAL',
          referenceId: withdrawalId,
          referenceType: 'withdrawal',
          note: `Withdrawal approved by admin`,
        },
      });

      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'APPROVED',
          adminNote: dto.adminNote,
          reviewedBy: adminUser.id,
          reviewedAt: new Date(),
        },
      });
    });

    this.logger.log(`Withdrawal ${withdrawalId} approved by admin ${adminUserId}`);
    return { status: 'APPROVED' };
  }

  // Admin: mark as completed after payout sent
  async markCompleted(withdrawalId: string, fuiouBatchNo?: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== 'APPROVED') throw new BadRequestException('Withdrawal must be APPROVED first');

    return this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        ...(fuiouBatchNo && { fuiouBatchNo }),
      },
    });
  }

  // Finance summary for admin dashboard
  async getFinanceSummary() {
    const [
      totalOrders,
      totalRevenue,
      pendingWithdrawals,
      completedWithdrawals,
      totalMutualCoinsIssued,
      totalUniversalCoinsIssued,
      totalHealthCoinsIssued,
      totalHealthCoinRedemption,
      totalMutualCoinBalance,
      totalUniversalCoinBalance,
      totalPlatformCommissionFromOrders,
      totalCommissionFromWithdrawals,
    ] = await Promise.all([
      this.prisma.order.count({ where: { status: 'COMPLETED' } }),
      this.prisma.order.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { totalAmount: true },
      }),
      this.prisma.withdrawal.count({ where: { status: 'PENDING' } }),
      this.prisma.withdrawal.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { netAmount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { walletType: 'MUTUAL_HEALTH_COIN', amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { walletType: 'UNIVERSAL_HEALTH_COIN', amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { walletType: 'HEALTH_COIN', amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.order.aggregate({
        where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED'] } },
        _sum: { healthCoinPaid: true },
      }),
      this.prisma.wallet.aggregate({
        where: { walletType: 'MUTUAL_HEALTH_COIN' },
        _sum: { balance: true },
      }),
      this.prisma.wallet.aggregate({
        where: { walletType: 'UNIVERSAL_HEALTH_COIN' },
        _sum: { balance: true },
      }),
      this.prisma.paymentTransaction.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { platformCommissionAmt: true },
      }),
      this.prisma.withdrawal.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { commissionAmt: true },
      }),
    ]);

    return {
      totalCompletedOrders: totalOrders,
      totalRevenue: (totalRevenue._sum.totalAmount ?? 0n).toString(),
      pendingWithdrawals,
      totalPaidOut: (completedWithdrawals._sum.netAmount ?? 0n).toString(),
      totalMutualCoinsIssued: (totalMutualCoinsIssued._sum.amount ?? 0n).toString(),
      totalUniversalCoinsIssued: (totalUniversalCoinsIssued._sum.amount ?? 0n).toString(),
      totalHealthCoinsIssued: (totalHealthCoinsIssued._sum.amount ?? 0n).toString(),
      totalHealthCoinRedemption: (totalHealthCoinRedemption._sum.healthCoinPaid ?? 0n).toString(),
      totalMutualCoinBalance: (totalMutualCoinBalance._sum.balance ?? 0n).toString(),
      totalUniversalCoinBalance: (totalUniversalCoinBalance._sum.balance ?? 0n).toString(),
      totalCommissionIncome: (
        (totalPlatformCommissionFromOrders._sum.platformCommissionAmt ?? 0n) +
        (totalCommissionFromWithdrawals._sum.commissionAmt ?? 0n)
      ).toString(),
    };
  }
}
