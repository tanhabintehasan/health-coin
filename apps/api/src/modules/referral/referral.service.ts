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
}

function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}
