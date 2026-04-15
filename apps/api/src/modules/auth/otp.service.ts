import { Injectable, BadRequestException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private otpKey(phone: string): string {
    return `otp:${phone}`;
  }

  private otpRateLimitKey(phone: string): string {
    return `otp:rate:${phone}`;
  }

  private otpHourlyKey(phone: string): string {
    return `otp:hourly:${phone}`;
  }

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
    const settings = await this.getSettings();

    if (!settings.smsEnabled && this.config.get('NODE_ENV') === 'production') {
      throw new BadRequestException('SMS service is temporarily disabled');
    }

    // Rate limit: 1 per resend period
    const rateLimitKey = this.otpRateLimitKey(phone);
    const recentSend = await this.redis.get(rateLimitKey);
    if (recentSend) {
      throw new BadRequestException(`请等待 ${settings.otpResend} 秒后再获取验证码`);
    }

    // Rate limit: hourly limit
    const hourlyKey = this.otpHourlyKey(phone);
    const hourlyCount = await this.redis.incr(hourlyKey);
    if (hourlyCount === 1) {
      await this.redis.expire(hourlyKey, 3600);
    }
    if (hourlyCount > settings.hourlyLimit) {
      throw new BadRequestException('验证码请求过于频繁，请稍后再试');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP (dynamic TTL)
    await this.redis.set(this.otpKey(phone), code, 'EX', settings.otpExpiry);
    // Store rate limit
    await this.redis.set(rateLimitKey, '1', 'EX', settings.otpResend);

    await this.sendSms(phone, code, settings);
  }

  async verifyOtp(phone: string, code: string): Promise<void> {
    const stored = await this.redis.get(this.otpKey(phone));
    if (!stored) {
      throw new BadRequestException('验证码已过期，请重新获取');
    }
    if (stored !== code) {
      throw new BadRequestException('验证码错误，请重新输入');
    }
    // Single use — delete immediately after successful verification
    await this.redis.del(this.otpKey(phone));
  }

  private async sendSms(phone: string, code: string, settings: any): Promise<void> {
    // In development, log the OTP instead of sending
    if (this.config.get('NODE_ENV') !== 'production') {
      this.logger.log(`[DEV OTP] Phone: ${phone}, Code: ${code}, Provider: ${settings.provider}, Template: ${settings.templateCode}`);
      return;
    }

    if (settings.provider === 'smsbao') {
      if (!settings.smsbaoUsername || !settings.smsbaoPassword || !settings.smsbaoTemplate) {
        this.logger.warn('[SMSbao] Configuration incomplete');
        return;
      }
      const content = settings.smsbaoTemplate.replace(/\[code\]/g, code);
      const md5Pass = require('crypto').createHash('md5').update(settings.smsbaoPassword).digest('hex');
      const encodedContent = encodeURIComponent(content);
      const url = `http://api.smsbao.com/sms?u=${settings.smsbaoUsername}&p=${md5Pass}&m=${phone}&c=${encodedContent}`;
      try {
        const axios = (await import('axios')).default;
        const { data } = await axios.get(url, { timeout: 10000 });
        if (data !== '0' && data !== 0) {
          this.logger.error(`[SMSbao] Failed to send SMS, code: ${data}`);
        } else {
          this.logger.log(`[SMSbao] SMS sent to ${phone}`);
        }
      } catch (err: any) {
        this.logger.error(`[SMSbao] Exception: ${err.message}`);
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
