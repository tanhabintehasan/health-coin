import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from './otp.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { customAlphabet } from 'nanoid';

const generateReferralCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly otpService: OtpService,
  ) {}

  async sendOtp(phone: string): Promise<{ smsSent: boolean; message: string; code?: string }> {
    return this.otpService.sendOtp(phone);
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

  // ---------------------------------------------------------------------------
  // TEMPORARY DEMO LOGIN — bypasses OTP/Redis/SMS for client review.
  // Controlled by DEMO_LOGIN_ENABLED env var.
  // Looks up pre-seeded demo users and returns valid JWT tokens.
  // Safe to remove after client review is complete.
  // ---------------------------------------------------------------------------
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
      const now = new Date();
      const stored = await this.prisma.refreshToken.findFirst({
        where: { userId: payload.sub, token: refreshToken, expiresAt: { gt: now } },
      });
      if (!stored) {
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

  async wxLogin(code: string) {
    const appId = await this.prisma.systemConfig.findUnique({ where: { key: 'wechat_appid' } });
    const secret = await this.prisma.systemConfig.findUnique({ where: { key: 'wechat_secret' } });
    if (!appId?.value || !secret?.value) {
      return { openId: `mock_openid_${code}`, message: 'Mock openid（未配置微信参数）' };
    }
    try {
      const axios = (await import('axios')).default;
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId.value}&secret=${secret.value}&js_code=${code}&grant_type=authorization_code`;
      const { data } = await axios.get(url, { timeout: 10000 });
      if (data.openid) {
        return { openId: data.openid, sessionKey: data.session_key, unionId: data.unionid };
      }
      return { openId: `mock_openid_${code}`, message: '微信接口未返回openid', wxErr: data };
    } catch (err: any) {
      return { openId: `mock_openid_${code}`, message: '微信接口异常', error: err.message };
    }
  }

  private async issueTokens(userId: string, phone: string, skipDbStore = false) {
    const payload = { sub: userId, phone };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET', 'default_secret'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '2h'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET', 'refresh_secret'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    if (!skipDbStore) {
      try {
        const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
        await this.prisma.refreshToken.create({
          data: { userId, token: refreshToken, expiresAt },
        });
      } catch {
        // Gracefully ignore DB failures so logins don't hard-fail
      }
    }

    return { accessToken, refreshToken };
  }
}
