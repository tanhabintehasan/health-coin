import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_SMSBAO_TEMPLATE = '【健康币】您的验证码是[code]，5分钟内有效。';

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
    const provider = map.sms_provider ?? 'smsbao';

    // Read SMS credentials from DB first, fallback to .env for production security
    const smsbaoUsername = map.smsbao_username || this.config.get('SMSBAO_USERNAME') || '';
    const smsbaoPassword = map.smsbao_password || this.config.get('SMSBAO_PASSWORD') || '';
    const smsbaoTemplate = map.smsbao_template || this.config.get('SMSBAO_TEMPLATE') || DEFAULT_SMSBAO_TEMPLATE;

    return {
      smsEnabled: map.sms_enabled === undefined ? true : map.sms_enabled === 'true',
      otpExpiry: parseInt(map.otp_expiry_seconds ?? '300', 10),
      otpResend: parseInt(map.otp_resend_seconds ?? '60', 10),
      hourlyLimit: parseInt(map.otp_hourly_limit ?? '5', 10),
      provider,
      templateCode: map.sms_template_code ?? '',
      signName: map.sms_sign_name ?? '',
      smsbaoUsername,
      smsbaoPassword,
      smsbaoTemplate,
    };
  }

  async sendOtp(phone: string): Promise<{ smsSent: boolean; message: string; code?: string }> {
    let settings;
    try {
      settings = await this.getSettings();
    } catch (err: any) {
      this.logger.error(`Failed to load OTP settings: ${err.message}`);
      throw new BadRequestException('Failed to load SMS settings');
    }

    this.logger.log(
      `[OTP] provider=${settings.provider} smsEnabled=${settings.smsEnabled} env=${this.config.get('NODE_ENV')} username=${settings.smsbaoUsername || '(empty)'} template=${settings.smsbaoTemplate || '(empty)'}`,
    );

    // sms_enabled is advisory only; we never block OTP generation. If SMS credentials are
    // missing or the gateway fails, we fall back to returning the code in the response.

    try {
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
        return { smsSent: true, message: 'OTP sent successfully' };
      } catch (err: any) {
        const msg = err instanceof BadRequestException ? ((err as any).response?.message || err.message) : err.message;
        this.logger.error(`[OTP SEND FAILED] Phone: ${phone}, Error: ${msg}`);
        throw new BadRequestException('短信发送失败，请稍后重试');
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(`[OTP SEND CRASH] ${err.message}\n${err.stack}`);
      throw new BadRequestException('Failed to send OTP');
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
      if (!settings.smsbaoUsername) {
        throw new BadRequestException('SMSbao username is missing. Please configure it in admin settings.');
      }
      if (!settings.smsbaoPassword) {
        throw new BadRequestException('SMSbao password is missing. Please configure it in admin settings.');
      }
      if (!settings.smsbaoTemplate) {
        throw new BadRequestException('SMSbao template is missing. Please configure it in admin settings and use [code] as placeholder.');
      }
      const content = settings.smsbaoTemplate.replace(/\[code\]/g, code);
      const md5Pass = crypto.createHash('md5').update(settings.smsbaoPassword).digest('hex');
      const encodedContent = encodeURIComponent(content);
      const url = `http://api.smsbao.com/sms?u=${settings.smsbaoUsername}&p=${md5Pass}&m=${phone}&c=${encodedContent}`;
      try {
        const axios = (await import('axios')).default;
        this.logger.log(`[SMSbao] Calling gateway for ${phone}`);
        const { data } = await axios.get(url, { timeout: 10000 });
        if (data !== '0' && data !== 0) {
          const smsbaoErrors: Record<string, string> = {
            '-1': '没有该用户账户 (No such user account)',
            '-2': '接口密钥不正确 (API key incorrect)',
            '-21': 'MD5接口密钥加密不正确 (MD5 encryption incorrect)',
            '-3': '短信数量不足 (Insufficient SMS balance)',
            '-11': '该用户被禁用 (User disabled)',
            '-14': '短信内容出现非法字符 (Illegal characters in content)',
            '-4': '手机号格式不正确 (Invalid phone format)',
            '-41': '手机号码为空 (Phone number empty)',
            '-42': '短信内容为空 (Content empty)',
            '-51': '短信签名有误 (Signature error)',
            '30': '密码错误 (Password error)',
            '40': '账号不存在 (Account does not exist)',
            '41': '余额不足 (Insufficient balance)',
            '42': '账户已过期 (Account expired)',
            '43': 'IP地址限制 (IP address restricted)',
            '50': '内容含有敏感词 (Content contains sensitive words)',
          };
          const errMsg = smsbaoErrors[String(data)] || `SMS gateway error code: ${data}`;
          this.logger.error(`[SMSbao] Failed to send SMS, code: ${data} (${errMsg})`);
          throw new BadRequestException(errMsg);
        } else {
          this.logger.log(`[SMSbao] SMS sent to ${phone}`);
        }
      } catch (err: any) {
        this.logger.error(`[SMSbao] Exception: ${err.message}`);
        throw new BadRequestException('Failed to send SMS');
      }
      return;
    }

    throw new BadRequestException(`SMS provider '${settings.provider}' is not supported. Only SMSbao is available.`);
  }
}
