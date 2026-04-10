import { Injectable, BadRequestException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly config: ConfigService,
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

  async sendOtp(phone: string): Promise<void> {
    // Rate limit: 1 per 60s
    const rateLimitKey = this.otpRateLimitKey(phone);
    const recentSend = await this.redis.get(rateLimitKey);
    if (recentSend) {
      throw new BadRequestException('Please wait 60 seconds before requesting another OTP');
    }

    // Rate limit: 5 per hour
    const hourlyKey = this.otpHourlyKey(phone);
    const hourlyCount = await this.redis.incr(hourlyKey);
    if (hourlyCount === 1) {
      await this.redis.expire(hourlyKey, 3600);
    }
    if (hourlyCount > 5) {
      throw new BadRequestException('Too many OTP requests. Please try again later');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP (5 min TTL)
    await this.redis.set(this.otpKey(phone), code, 'EX', 300);
    // Store rate limit (60s TTL)
    await this.redis.set(rateLimitKey, '1', 'EX', 60);

    await this.sendSms(phone, code);
  }

  async verifyOtp(phone: string, code: string): Promise<void> {
    const stored = await this.redis.get(this.otpKey(phone));
    if (!stored) {
      throw new BadRequestException('OTP expired or not found');
    }
    if (stored !== code) {
      throw new BadRequestException('Invalid OTP');
    }
    // Single use — delete immediately after successful verification
    await this.redis.del(this.otpKey(phone));
  }

  private async sendSms(phone: string, code: string): Promise<void> {
    // In development, log the OTP instead of sending
    if (this.config.get('NODE_ENV') !== 'production') {
      this.logger.log(`[DEV OTP] Phone: ${phone}, Code: ${code}`);
      return;
    }

    // Aliyun SMS integration
    // TODO: integrate @alicloud/pop-core or aliyun-sdk when going to production
    // For now: HTTP call to Aliyun SMS API
    const accessKeyId = this.config.get('ALIYUN_ACCESS_KEY_ID');
    const signName = this.config.get('ALIYUN_SMS_SIGN_NAME');
    const templateCode = this.config.get('ALIYUN_SMS_TEMPLATE_CODE');

    this.logger.log(
      `[SMS] Would send to ${phone}: code=${code}, sign=${signName}, template=${templateCode}, key=${accessKeyId}`,
    );
    // Production: call Aliyun SMS SendSms API here
  }
}
