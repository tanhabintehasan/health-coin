import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('public')
  @ApiOperation({ summary: 'Get public platform settings (no auth required)' })
  async getPublicSettings() {
    const keys = [
      'platform_name',
      'platform_hotline',
      'platform_wechat',
      'platform_address',
      'sms_enabled',
      'otp_expiry_seconds',
      'otp_resend_seconds',
      'payment_fuiou_enabled',
      'payment_wechat_enabled',
      'payment_alipay_enabled',
      'payment_coin_enabled',
      'product_review_required',
      'redemption_code_valid_days',
      'allow_partial_redemption',
      'mutual_coin_own_rate',
      'mutual_coin_l1_rate',
      'mutual_coin_l2_rate',
      'health_coin_multiplier',
      'universal_coin_own_rate',
      'universal_coin_l1_rate',
      'withdrawal_commission_rate',
      'platform_commission_rate',
    ];

    const configs = await this.prisma.systemConfig.findMany({
      where: { key: { in: keys } },
    });

    const map: Record<string, string> = {};
    for (const c of configs) map[c.key] = c.value;

    return {
      platform: {
        name: map.platform_name ?? 'HealthCoin',
        hotline: map.platform_hotline ?? '',
        wechat: map.platform_wechat ?? '',
        address: map.platform_address ?? '',
      },
      auth: {
        smsEnabled: map.sms_enabled === 'true',
        otpExpirySeconds: parseInt(map.otp_expiry_seconds ?? '300', 10),
        otpResendSeconds: parseInt(map.otp_resend_seconds ?? '60', 10),
      },
      payments: {
        fuiou: map.payment_fuiou_enabled === 'true',
        wechat: map.payment_wechat_enabled === 'true',
        alipay: map.payment_alipay_enabled === 'true',
        coin: map.payment_coin_enabled === 'true',
      },
      business: {
        productReviewRequired: map.product_review_required === 'true',
        redemptionCodeValidDays: parseInt(map.redemption_code_valid_days ?? '30', 10),
        allowPartialRedemption: map.allow_partial_redemption === 'true',
      },
      coinRates: {
        mutualCoinOwnRate: parseFloat(map.mutual_coin_own_rate ?? '0.5'),
        mutualCoinL1Rate: parseFloat(map.mutual_coin_l1_rate ?? '0.25'),
        mutualCoinL2Rate: parseFloat(map.mutual_coin_l2_rate ?? '0.1'),
        healthCoinMultiplier: parseFloat(map.health_coin_multiplier ?? '2.0'),
        universalCoinOwnRate: parseFloat(map.universal_coin_own_rate ?? '0.2'),
        universalCoinL1Rate: parseFloat(map.universal_coin_l1_rate ?? '0.1'),
      },
      finance: {
        withdrawalCommissionRate: parseFloat(map.withdrawal_commission_rate ?? '0.05'),
        platformCommissionRate: parseFloat(map.platform_commission_rate ?? '0.05'),
      },
    };
  }
}
