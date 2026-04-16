import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private async getSettings() {
    const keys = [
      'sms_enabled', 'otp_expiry_seconds', 'otp_resend_seconds', 'otp_hourly_limit',
      'sms_provider', 'sms_template_code', 'sms_sign_name',
      'smsbao_username', 'smsbao_password', 'smsbao_template',
    ];
    const configs = await this.prisma.systemConfig.findMany({ where: { key: { in: keys } } });
    const map: Record<string, string> = {};
    for (const c of configs) map[c.key] = c.value;
    return {
      smsEnabled: map.sms_enabled === 'true',
      otpExpiry: parseInt(map.otp_expiry_seconds ?? '300', 10),
      otpResend: parseInt(map.otp_resend_seconds ?? '60', 10),
      hourlyLimit: parseInt(map.otp_hourly_limit ?? '5', 10),
      provider: map.sms_provider ?? 'aliyun',
      templateCode: map.sms_template_code ?? '',
      signName: map.sms_sign_name ?? '',
      smsbaoUsername: map.smsbao_username ?? '',
      smsbaoPassword: map.smsbao_password ?? '',
      smsbaoTemplate: map.smsbao_template ?? '',
    };
  }

  async sendOtp(phone: string): Promise<void> {
    let settings;
    try {
      settings = await this.getSettings();
    } catch (err: any) {
      this.logger.error(`Failed to load OTP settings: ${err.message}`);
      throw new BadRequestException('Failed to load SMS settings');
    }

    if (!settings.smsEnabled && this.config.get('NODE_ENV') === 'production') {
      throw new BadRequestException('SMS service is temporarily disabled');
    }

    const now = new Date();

    // Rate limit: 1 per resend period
    const resendWindow = new Date(now.getTime() - settings.otpResend * 1000);
    const recentSend = await this.prisma.otpCode.count({
      where: { phone, createdAt: { gte: resendWindow } },
    });
    if (recentSend > 0) {
      throw new BadRequestException(`请等待 ${settings.otpResend} 秒后再获取验证码`);
    }

    // Rate limit: hourly limit
    const hourlyWindow = new Date(now.getTime() - 3600 * 1000);
    const hourlyCount = await this.prisma.otpCode.count({
      where: { phone, createdAt: { gte: hourlyWindow } },
    });
    if (hourlyCount >= settings.hourlyLimit) {
      throw new BadRequestException('验证码请求过于频繁，请稍后再试');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(now.getTime() + settings.otpExpiry * 1000);

    // Clean up expired codes for this phone (best-effort)
    await this.prisma.otpCode.deleteMany({
      where: { phone, expiresAt: { lt: now } },
    });

    // Store OTP
    await this.prisma.otpCode.create({
      data: { phone, code, purpose: 'login', expiresAt },
    });

    try {
      await this.sendSms(phone, code, settings);
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(`sendSms failed: ${err.message}`);
      throw new BadRequestException('Failed to send SMS');
    }
  }

  async verifyOtp(phone: string, code: string): Promise<void> {
    const now = new Date();
    const record = await this.prisma.otpCode.findFirst({
      where: { phone, code, expiresAt: { gt: now } },
    });
    if (!record) {
      throw new BadRequestException('验证码已过期或错误，请重新获取');
    }
    // Single use — delete immediately after successful verification
    await this.prisma.otpCode.deleteMany({
      where: { phone, code },
    });
  }

  private async sendSms(phone: string, code: string, settings: any): Promise<void> {
    // In development, log the OTP instead of sending
    if (this.config.get('NODE_ENV') !== 'production') {
      this.logger.log(`[DEV OTP] Phone: ${phone}, Code: ${code}, Provider: ${settings.provider}, Template: ${settings.templateCode}`);
      return;
    }

    if (settings.provider === 'smsbao') {
      if (!settings.smsbaoUsername || !settings.smsbaoPassword || !settings.smsbaoTemplate) {
        throw new BadRequestException('SMS provider not configured. Please set SMSbao credentials in admin settings.');
      }
      const content = settings.smsbaoTemplate.replace(/\[code\]/g, code);
      const md5Pass = crypto.createHash('md5').update(settings.smsbaoPassword).digest('hex');
      const encodedContent = encodeURIComponent(content);
      const url = `http://api.smsbao.com/sms?u=${settings.smsbaoUsername}&p=${md5Pass}&m=${phone}&c=${encodedContent}`;
      try {
        const axios = (await import('axios')).default;
        const { data } = await axios.get(url, { timeout: 10000 });
        if (data !== '0' && data !== 0) {
          this.logger.error(`[SMSbao] Failed to send SMS, code: ${data}`);
          throw new BadRequestException('SMS gateway error');
        } else {
          this.logger.log(`[SMSbao] SMS sent to ${phone}`);
        }
      } catch (err: any) {
        this.logger.error(`[SMSbao] Exception: ${err.message}`);
        throw new BadRequestException('Failed to send SMS');
      }
      return;
    }

    // Env-based credentials for security
    const accessKeyId = this.config.get('ALIYUN_ACCESS_KEY_ID');
    const accessKeySecret = this.config.get('ALIYUN_ACCESS_KEY_SECRET');

    if (settings.provider === 'aliyun') {
      this.logger.log(
        `[SMS Aliyun] To=${phone} Code=${code} Sign=${settings.signName} Template=${settings.templateCode}`,
      );
      // Production: integrate @alicloud/pop-core here using accessKeyId / accessKeySecret
    } else {
      this.logger.log(`[SMS ${settings.provider}] To=${phone} Code=${code} — provider not implemented yet`);
    }
  }
}
