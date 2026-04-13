import { Injectable, UnauthorizedException, Inject, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from './otp.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import Redis from 'ioredis';
import { customAlphabet } from 'nanoid';

const generateReferralCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly otpService: OtpService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async sendOtp(phone: string): Promise<{ message: string }> {
    await this.otpService.sendOtp(phone);
    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    await this.otpService.verifyOtp(dto.phone, dto.code);

    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });

    if (!user) {
      // New user — find referrer if code provided
      let referrerId: string | undefined;
      if (dto.referralCode) {
        const referrer = await this.prisma.user.findUnique({
          where: { referralCode: dto.referralCode },
          select: { id: true },
        });
        referrerId = referrer?.id;
      }

      // Generate unique referral code with collision retry
      let referralCode = generateReferralCode();
      let attempts = 0;
      while (attempts < 3) {
        const existing = await this.prisma.user.findUnique({ where: { referralCode } });
        if (!existing) break;
        referralCode = generateReferralCode();
        attempts++;
      }

      user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            phone: dto.phone,
            referralCode,
            referrerId,
            membershipLevel: 1,
          },
        });

        // Auto-create 3 wallets
        await tx.wallet.createMany({
          data: [
            { userId: newUser.id, walletType: 'HEALTH_COIN', balance: 0n },
            { userId: newUser.id, walletType: 'MUTUAL_HEALTH_COIN', balance: 0n },
            { userId: newUser.id, walletType: 'UNIVERSAL_HEALTH_COIN', balance: 0n },
          ],
        });

        return newUser;
      });
    }

    const tokens = await this.issueTokens(user.id, user.phone);
    return {
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        membershipLevel: user.membershipLevel,
        referralCode: user.referralCode,
        isNewUser: !user.nickname,
      },
      ...tokens,
    };
  }

  async demoLogin(role: 'admin' | 'merchant' | 'user') {
    const enabled = this.config.get('DEMO_LOGIN_ENABLED') === 'true';
    if (!enabled) {
      throw new ForbiddenException('Demo login is disabled');
    }

    const demoPhones: Record<string, string> = {
      admin: '13800000001',
      merchant: '13800000002',
      user: '13800000004',
    };

    const phone = demoPhones[role];
    if (!phone) {
      throw new UnauthorizedException('Invalid demo role');
    }

    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new UnauthorizedException('Demo user not found. Please run seeds.');
    }

    const tokens = await this.issueTokens(user.id, user.phone, true);
    return {
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        membershipLevel: user.membershipLevel,
        referralCode: user.referralCode,
        isNewUser: !user.nickname,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', 'refresh_secret'),
      });

      // Check refresh token not revoked
      const stored = await this.redis.get(`refresh:${payload.sub}`);
      if (stored !== refreshToken) {
        throw new UnauthorizedException('Refresh token revoked or invalid');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, phone: true, isActive: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return this.issueTokens(user.id, user.phone);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async issueTokens(userId: string, phone: string, skipRedis = false) {
    const payload = { sub: userId, phone };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET', 'default_secret'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '2h'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET', 'refresh_secret'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    if (!skipRedis) {
      try {
        // Store refresh token in Redis (7d TTL)
        await this.redis.set(`refresh:${userId}`, refreshToken, 'EX', 7 * 24 * 3600);
      } catch {
        // Gracefully ignore Redis failures so logins don't hard-fail when Redis is down
      }
    }

    return { accessToken, refreshToken };
  }
}
