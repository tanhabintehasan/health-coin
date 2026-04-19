import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    const data: any = {};

    if (dto.nickname !== undefined) data.nickname = dto.nickname;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.birthday !== undefined) data.birthday = dto.birthday ? new Date(dto.birthday) : null;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.regionId !== undefined) data.regionId = dto.regionId || null;

    // Validate email uniqueness if changed
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
        select: { id: true },
      });
      if (existing && existing.id !== userId) {
        throw new BadRequestException('Email already in use');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        phone: true,
        nickname: true,
        name: true,
        avatarUrl: true,
        gender: true,
        birthday: true,
        email: true,
        bio: true,
        membershipLevel: true,
        referralCode: true,
        regionId: true,
      },
    });
  }
}
