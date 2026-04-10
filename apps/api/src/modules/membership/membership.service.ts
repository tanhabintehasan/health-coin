import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTiers() {
    return this.prisma.membershipTier.findMany({ orderBy: { level: 'asc' } });
  }

  async getUserTier(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { membershipLevel: true, totalMutualCoinsEarned: true },
    });
    if (!user) return null;

    const tier = await this.prisma.membershipTier.findUnique({ where: { level: user.membershipLevel } });
    const nextTier = await this.prisma.membershipTier.findFirst({
      where: { level: { gt: user.membershipLevel } },
      orderBy: { level: 'asc' },
    });

    return {
      current: tier,
      totalCoins: user.totalMutualCoinsEarned.toString(),
      nextTier: nextTier
        ? {
            ...nextTier,
            minCoins: nextTier.minCoins.toString(),
            coinsNeeded: (nextTier.minCoins - user.totalMutualCoinsEarned).toString(),
          }
        : null,
    };
  }

  async checkAndUpgradeUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, membershipLevel: true, totalMutualCoinsEarned: true },
    });
    if (!user) return;

    const tiers = await this.prisma.membershipTier.findMany({
      where: { level: { gt: user.membershipLevel } },
      orderBy: { level: 'desc' },
    });

    const eligible = tiers.find((t) => user.totalMutualCoinsEarned >= t.minCoins);
    if (eligible) {
      await this.prisma.user.update({ where: { id: userId }, data: { membershipLevel: eligible.level } });
      this.logger.log(`User ${userId} upgraded to level ${eligible.level}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async autoUpgradeAll(): Promise<void> {
    this.logger.log('Running membership auto-upgrade...');
    const tiers = await this.prisma.membershipTier.findMany({ orderBy: { level: 'desc' } });
    let cursor: string | undefined;
    let upgraded = 0;

    while (true) {
      const users = await this.prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, membershipLevel: true, totalMutualCoinsEarned: true },
        take: 500,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        orderBy: { id: 'asc' },
      });

      if (!users.length) break;

      for (const user of users) {
        const eligible = tiers.find(
          (t) => t.level > user.membershipLevel && user.totalMutualCoinsEarned >= t.minCoins,
        );
        if (eligible) {
          await this.prisma.user.update({ where: { id: user.id }, data: { membershipLevel: eligible.level } });
          upgraded++;
        }
      }

      cursor = users[users.length - 1].id;
      if (users.length < 500) break;
    }

    this.logger.log(`Auto-upgrade complete. ${upgraded} users upgraded.`);
  }
}
