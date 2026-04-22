import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as QRCode from 'qrcode';

@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyReferral(userId: string, appUrl: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, referrals: { select: { id: true } } },
    });

    if (!user) throw new NotFoundException('User not found');

    const referralUrl = `${appUrl}/register?ref=${user.referralCode}`;

    // Generate QR code as base64 data URL
    const qrCodeDataUrl = await QRCode.toDataURL(referralUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    return {
      referralCode: user.referralCode,
      referralUrl,
      qrCode: qrCodeDataUrl,
      totalReferrals: user.referrals.length,
    };
  }

  async getMyReferrals(userId: string) {
    // Get direct referrals (L1)
    const directReferrals = await this.prisma.user.findMany({
      where: { referrerId: userId },
      select: {
        id: true,
        phone: true,
        nickname: true,
        membershipLevel: true,
        createdAt: true,
        referrals: {
          select: { id: true, phone: true, nickname: true, membershipLevel: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mask phone numbers for privacy
    const masked = directReferrals.map((u) => ({
      ...u,
      phone: maskPhone(u.phone),
      referrals: u.referrals.map((r) => ({ ...r, phone: maskPhone(r.phone) })),
    }));

    const totalL1 = directReferrals.length;
    const totalL2 = directReferrals.reduce((sum, u) => sum + u.referrals.length, 0);

    return {
      directReferrals: masked,
      totalL1,
      totalL2,
      total: totalL1 + totalL2,
    };
  }

  async getReferralTree(userId: string) {
    // Admin use — full tree without masking
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, phone: true, nickname: true, membershipLevel: true,
        referrals: {
          select: {
            id: true, phone: true, nickname: true, membershipLevel: true, createdAt: true,
            referrals: {
              select: { id: true, phone: true, nickname: true, membershipLevel: true, createdAt: true },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getReferralEarnings(userId: string) {
    // Sum all referral reward transactions
    const transactions = await this.prisma.walletTransaction.findMany({
      where: {
        userId,
        txType: { in: ['REFERRAL_L1_REWARD', 'REFERRAL_L2_REWARD'] },
      },
      select: { txType: true, amount: true, walletType: true },
    });

    let l1Mutual = 0n, l1Universal = 0n;
    let l2Mutual = 0n, l2Universal = 0n;

    for (const t of transactions) {
      if (t.txType === 'REFERRAL_L1_REWARD') {
        if (t.walletType === 'MUTUAL_HEALTH_COIN') l1Mutual += t.amount;
        else if (t.walletType === 'UNIVERSAL_HEALTH_COIN') l1Universal += t.amount;
      } else if (t.txType === 'REFERRAL_L2_REWARD') {
        if (t.walletType === 'MUTUAL_HEALTH_COIN') l2Mutual += t.amount;
        else if (t.walletType === 'UNIVERSAL_HEALTH_COIN') l2Universal += t.amount;
      }
    }

    return {
      l1: {
        mutualCoins: l1Mutual.toString(),
        universalCoins: l1Universal.toString(),
        total: (l1Mutual + l1Universal).toString(),
      },
      l2: {
        mutualCoins: l2Mutual.toString(),
        universalCoins: l2Universal.toString(),
        total: (l2Mutual + l2Universal).toString(),
      },
      total: (l1Mutual + l1Universal + l2Mutual + l2Universal).toString(),
    };
  }
}

function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}
