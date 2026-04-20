import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from './otp.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SetPasswordDto, ChangePasswordDto, LoginWithPasswordDto } from './dto/set-password.dto';
import { WxLoginDto } from './dto/wx-login.dto';
import { customAlphabet } from 'nanoid';
import * as bcrypt from 'bcryptjs';

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
      const maxAttempts = 100;
      while (attempts < maxAttempts) {
        const existing = await this.prisma.user.findUnique({ where: { referralCode } });
        if (!existing) break;
        referralCode = generateReferralCode();
        attempts++;
      }
      if (attempts >= maxAttempts) {
        throw new BadRequestException('无法生成唯一推荐码，请重试');
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
        hasPassword: !!user.password,
      },
      ...tokens,
    };
  }

  // ---------------------------------------------------------------------------
  // Password-based authentication
  // ---------------------------------------------------------------------------
  async loginWithPassword(dto: LoginWithPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      throw new UnauthorizedException('手机号或密码错误');
    }
    if (!user.password) {
      throw new UnauthorizedException('该账号未设置密码，请使用验证码登录');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('账号已被禁用');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('手机号或密码错误');
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
        hasPassword: true,
      },
      ...tokens,
    };
  }

  async setPassword(userId: string, dto: SetPasswordDto) {
    const hash = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });
    return { success: true, message: '密码设置成功' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      throw new BadRequestException('当前未设置密码');
    }
    const valid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!valid) {
      throw new BadRequestException('原密码错误');
    }
    const hash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });
    return { success: true, message: '密码修改成功' };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
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

      // Rotate refresh token: delete the old one before issuing a new one
      await this.prisma.refreshToken.deleteMany({
        where: { userId: payload.sub, token: refreshToken },
      });

      return this.issueTokens(user.id, user.phone);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ---------------------------------------------------------------------------
  // WeChat Mini-Program Login
  // ---------------------------------------------------------------------------
  async wxLogin(dto: WxLoginDto) {
    const appId = await this.prisma.systemConfig.findUnique({ where: { key: 'wechat_mini_appid' } });
    const secret = await this.prisma.systemConfig.findUnique({ where: { key: 'wechat_mini_secret' } });

    if (!appId?.value || !secret?.value) {
      throw new BadRequestException('WeChat mini-program login is not configured');
    }

    let openId: string | undefined;
    let sessionKey: string | undefined;
    let unionId: string | undefined;

    try {
      const axios = (await import('axios')).default;
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId.value}&secret=${secret.value}&js_code=${dto.code}&grant_type=authorization_code`;
      const { data } = await axios.get(url, { timeout: 10000 });
      if (data.openid) {
        openId = data.openid;
        sessionKey = data.session_key;
        unionId = data.unionid;
      }
    } catch (err: any) {
      throw new BadRequestException(`WeChat auth failed: ${err.message}`);
    }

    if (!openId) {
      throw new BadRequestException('WeChat did not return openId');
    }

    // Try to find existing user by openId
    let user = await this.prisma.user.findUnique({ where: { wechatOpenId: openId } });

    if (user) {
      const tokens = await this.issueTokens(user.id, user.phone);
      return {
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          membershipLevel: user.membershipLevel,
          referralCode: user.referralCode,
          isNewUser: !user.nickname,
          hasPassword: !!user.password,
        },
        ...tokens,
        isNewUser: false,
        openId,
      };
    }

    // If phone provided, try to link to existing phone user
    if (dto.phone) {
      const phoneUser = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (phoneUser) {
        await this.prisma.user.update({
          where: { id: phoneUser.id },
          data: { wechatOpenId: openId },
        });
        const tokens = await this.issueTokens(phoneUser.id, phoneUser.phone);
        return {
          user: {
            id: phoneUser.id,
            phone: phoneUser.phone,
            nickname: phoneUser.nickname,
            membershipLevel: phoneUser.membershipLevel,
            referralCode: phoneUser.referralCode,
            isNewUser: !phoneUser.nickname,
            hasPassword: !!phoneUser.password,
          },
          ...tokens,
          isNewUser: false,
          openId,
        };
      }
    }

    // Create new WeChat user
    let referrerId: string | undefined;
    if (dto.referralCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: dto.referralCode },
        select: { id: true },
      });
      referrerId = referrer?.id;
    }

    let referralCode = generateReferralCode();
    let attempts = 0;
    const maxAttempts = 100;
    while (attempts < maxAttempts) {
      const existing = await this.prisma.user.findUnique({ where: { referralCode } });
      if (!existing) break;
      referralCode = generateReferralCode();
      attempts++;
    }

    user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          phone: dto.phone || `wx_${openId.slice(-8)}`,
          wechatOpenId: openId,
          referralCode,
          referrerId,
          nickname: dto.nickname || undefined,
          avatarUrl: dto.avatarUrl || undefined,
          membershipLevel: 1,
        },
      });

      await tx.wallet.createMany({
        data: [
          { userId: newUser.id, walletType: 'HEALTH_COIN', balance: 0n },
          { userId: newUser.id, walletType: 'MUTUAL_HEALTH_COIN', balance: 0n },
          { userId: newUser.id, walletType: 'UNIVERSAL_HEALTH_COIN', balance: 0n },
        ],
      });

      return newUser;
    });

    const tokens = await this.issueTokens(user.id, user.phone);
    return {
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        membershipLevel: user.membershipLevel,
        referralCode: user.referralCode,
        isNewUser: true,
        hasPassword: false,
      },
      ...tokens,
      isNewUser: true,
      openId,
    };
  }

  // ---------------------------------------------------------------------------
  // WeChat Web OAuth (QR Login)
  // ---------------------------------------------------------------------------
  async wechatWebOAuth(code: string) {
    const appId = this.config.get('WECHAT_APPID');
    const secret = this.config.get('WECHAT_APP_SECRET');
    if (!appId || !secret) {
      throw new BadRequestException('WeChat OAuth is not configured');
    }

    try {
      const axios = (await import('axios')).default;
      const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${secret}&code=${code}&grant_type=authorization_code`;
      const { data: tokenData } = await axios.get(tokenUrl, { timeout: 10000 });

      if (!tokenData.openid) {
        throw new BadRequestException(tokenData.errmsg || 'WeChat OAuth failed');
      }

      // Get user info
      const infoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}&lang=zh_CN`;
      const { data: userInfo } = await axios.get(infoUrl, { timeout: 10000 });

      let user = await this.prisma.user.findUnique({ where: { wechatOpenId: tokenData.openid } });

      if (!user) {
        let referralCode = generateReferralCode();
        let attempts = 0;
        while (attempts < 100) {
          const existing = await this.prisma.user.findUnique({ where: { referralCode } });
          if (!existing) break;
          referralCode = generateReferralCode();
          attempts++;
        }

        user = await this.prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              phone: `wx_${tokenData.openid.slice(-8)}`,
              wechatOpenId: tokenData.openid,
              nickname: userInfo.nickname || undefined,
              avatarUrl: userInfo.headimgurl || undefined,
              gender: userInfo.sex === 1 ? 'male' : userInfo.sex === 2 ? 'female' : undefined,
              referralCode,
              membershipLevel: 1,
            },
          });
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
          hasPassword: !!user.password,
        },
        ...tokens,
        isNewUser: !user.nickname,
      };
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('WeChat OAuth failed: ' + err.message);
    }
  }

  private async issueTokens(userId: string, phone: string, skipDbStore = false) {
    const payload = { sub: userId, phone };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '2h'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    if (!skipDbStore) {
      const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
      await this.prisma.refreshToken.create({
        data: { userId, token: refreshToken, expiresAt },
      });
    }

    return { accessToken, refreshToken };
  }
}
