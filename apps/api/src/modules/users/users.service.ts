import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        region: true,
        wallets: {
          select: { walletType: true, balance: true },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      ...user,
      wallets: user.wallets.map((w) => ({
        type: w.walletType,
        balance: w.balance.toString(), // BigInt → string for JSON
      })),
    };
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.nickname !== undefined && { nickname: dto.nickname }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.regionId !== undefined && { regionId: dto.regionId }),
      },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatarUrl: true,
        membershipLevel: true,
        referralCode: true,
        regionId: true,
      },
    });
  }
}
