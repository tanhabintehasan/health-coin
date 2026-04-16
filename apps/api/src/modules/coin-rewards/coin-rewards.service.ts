import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletTransactionService } from '../wallets/wallet-transaction.service';
import { applyRate } from '../../common/utils/money.util';

export interface OrderRewardPayload {
  orderId: string;
  buyerId: string;
  orderAmount: bigint;
}

@Injectable()
export class CoinRewardsService {
  private readonly logger = new Logger(CoinRewardsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletTx: WalletTransactionService,
  ) {}

  async scheduleRewards(payload: OrderRewardPayload): Promise<void> {
    // Process synchronously now that Bull/Redis has been removed
    await this.processOrderRewards(payload);
  }

  async processOrderRewards(payload: { orderId: string; buyerId: string; orderAmount: bigint }): Promise<void> {
    const { orderId, buyerId, orderAmount } = payload;

    const configs = await this.prisma.systemConfig.findMany({
      where: {
        key: {
          in: [
            'mutual_coin_own_rate', 'mutual_coin_l1_rate', 'mutual_coin_l2_rate',
            'health_coin_multiplier', 'universal_coin_own_rate', 'universal_coin_l1_rate',
          ],
        },
      },
    });
    const cfg = Object.fromEntries(configs.map((c) => [c.key, parseFloat(c.value)]));

    const mutualOwnRate     = cfg['mutual_coin_own_rate']     ?? 0.5;
    const mutualL1Rate      = cfg['mutual_coin_l1_rate']      ?? 0.25;
    const mutualL2Rate      = cfg['mutual_coin_l2_rate']      ?? 0.1;
    const healthMultiplier  = cfg['health_coin_multiplier']   ?? 2.0;
    const universalOwnRate  = cfg['universal_coin_own_rate']  ?? 0.2;
    const universalL1Rate   = cfg['universal_coin_l1_rate']   ?? 0.1;

    const buyer = await this.prisma.user.findUnique({
      where: { id: buyerId },
      include: { referrer: { include: { referrer: true } } },
    });

    if (!buyer) { this.logger.error(`Buyer not found: ${buyerId}`); return; }

    // Mutual Health Coins — buyer
    const mutualForBuyer = applyRate(orderAmount, mutualOwnRate);
    await this.walletTx.credit({
      userId: buyerId, walletType: 'MUTUAL_HEALTH_COIN', amount: mutualForBuyer,
      txType: 'ORDER_REWARD', referenceId: orderId, referenceType: 'order',
      appliedRate: mutualOwnRate, note: 'Own order mutual coin reward',
    });

    // Mutual Health Coins — L1 referrer
    if (buyer.referrer) {
      const mutualForL1 = applyRate(orderAmount, mutualL1Rate);
      await this.walletTx.credit({
        userId: buyer.referrer.id, walletType: 'MUTUAL_HEALTH_COIN', amount: mutualForL1,
        txType: 'REFERRAL_L1_REWARD', referenceId: orderId, referenceType: 'order', appliedRate: mutualL1Rate,
      });

      // Mutual Health Coins — L2 referrer
      if (buyer.referrer.referrer) {
        const mutualForL2 = applyRate(orderAmount, mutualL2Rate);
        await this.walletTx.credit({
          userId: buyer.referrer.referrer.id, walletType: 'MUTUAL_HEALTH_COIN', amount: mutualForL2,
          txType: 'REFERRAL_L2_REWARD', referenceId: orderId, referenceType: 'order', appliedRate: mutualL2Rate,
        });
      }
    }

    // Health Coins = mutual earned by buyer × multiplier
    const healthForBuyer = applyRate(mutualForBuyer, healthMultiplier);
    await this.walletTx.credit({
      userId: buyerId, walletType: 'HEALTH_COIN', amount: healthForBuyer,
      txType: 'ORDER_REWARD', referenceId: orderId, referenceType: 'order',
      appliedRate: healthMultiplier, note: 'Health coin (2× mutual coins)',
    });

    // Universal Health Coins — buyer
    const universalForBuyer = applyRate(orderAmount, universalOwnRate);
    await this.walletTx.credit({
      userId: buyerId, walletType: 'UNIVERSAL_HEALTH_COIN', amount: universalForBuyer,
      txType: 'ORDER_REWARD', referenceId: orderId, referenceType: 'order', appliedRate: universalOwnRate,
    });

    // Universal Health Coins — L1 referrer
    if (buyer.referrer) {
      const universalForL1 = applyRate(orderAmount, universalL1Rate);
      await this.walletTx.credit({
        userId: buyer.referrer.id, walletType: 'UNIVERSAL_HEALTH_COIN', amount: universalForL1,
        txType: 'REFERRAL_L1_REWARD', referenceId: orderId, referenceType: 'order', appliedRate: universalL1Rate,
      });
    }

    // Regional rewards — process synchronously now that queue is removed
    if (buyer.regionId) {
      await this.processRegionalRewards({
        orderId, buyerId, orderAmount: orderAmount.toString(), regionId: buyer.regionId, membershipLevel: buyer.membershipLevel,
      });
    }

    // Update lifetime mutual coins for auto-upgrade check
    await this.prisma.user.update({
      where: { id: buyerId },
      data: { totalMutualCoinsEarned: { increment: mutualForBuyer } },
    });

    this.logger.log(`Coin rewards processed for order ${orderId}`);
  }

  async processRegionalRewards(payload: {
    orderId: string;
    buyerId: string;
    orderAmount: string;
    regionId: string;
    membershipLevel: number;
  }): Promise<void> {
    const orderAmount = BigInt(payload.orderAmount);
    const tier = await this.prisma.membershipTier.findUnique({ where: { level: payload.membershipLevel } });
    const regionalRate = Number(tier?.regionalCoinRate ?? 0);
    if (regionalRate === 0) return;

    const totalPool = applyRate(orderAmount, regionalRate);
    if (totalPool === 0n) return;

    const regionUsers = await this.prisma.user.findMany({
      where: { regionId: payload.regionId, isActive: true, id: { not: payload.buyerId } },
      select: { id: true },
    });

    if (!regionUsers.length) return;

    const perUser = totalPool / BigInt(regionUsers.length);
    if (perUser === 0n) return;

    for (const u of regionUsers) {
      await this.walletTx.credit({
        userId: u.id, walletType: 'UNIVERSAL_HEALTH_COIN', amount: perUser,
        txType: 'REGIONAL_REWARD', referenceId: payload.orderId, referenceType: 'order', appliedRate: regionalRate,
      });
    }

    this.logger.log(`Regional rewards distributed to ${regionUsers.length} users for order ${payload.orderId}`);
  }
}
