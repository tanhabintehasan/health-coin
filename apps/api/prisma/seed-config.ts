import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const configs = [
  // Coin reward rates
  { key: 'mutual_coin_own_rate', value: '0.5' },
  { key: 'mutual_coin_l1_rate', value: '0.25' },
  { key: 'mutual_coin_l2_rate', value: '0.1' },
  { key: 'health_coin_multiplier', value: '2.0' },
  { key: 'universal_coin_own_rate', value: '0.2' },
  { key: 'universal_coin_l1_rate', value: '0.1' },
  // Finance / commissions
  { key: 'withdrawal_commission_rate', value: '0.05' },
  { key: 'platform_commission_rate', value: '0.05' },
  // Platform switches
  { key: 'order_approval_required', value: 'false' },
  { key: 'product_review_required', value: 'true' },
  // Redemption
  { key: 'redemption_code_valid_days', value: '30' },
  { key: 'allow_partial_redemption', value: 'true' },
  // SMS provider settings (dynamic control)
  { key: 'sms_provider', value: 'aliyun' },
  { key: 'sms_enabled', value: 'true' },
  { key: 'sms_template_code', value: 'SMS_12345678' },
  { key: 'sms_sign_name', value: '健康币平台' },
  { key: 'otp_expiry_seconds', value: '300' },
  { key: 'otp_resend_seconds', value: '60' },
  { key: 'otp_hourly_limit', value: '5' },
  // Payment provider settings
  { key: 'payment_provider_primary', value: 'fuiou' },
  { key: 'payment_fuiou_enabled', value: 'true' },
  { key: 'payment_wechat_enabled', value: 'false' },
  { key: 'payment_alipay_enabled', value: 'false' },
  { key: 'payment_coin_enabled', value: 'true' },
  // Platform info
  { key: 'platform_name', value: 'HealthCoin 健康币平台' },
  { key: 'platform_hotline', value: '400-888-6666' },
  { key: 'platform_wechat', value: 'healthcoin_official' },
  { key: 'platform_address', value: '上海市浦东新区张江高科技园区' },
];

async function main() {
  console.log('Seeding system configs...');
  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }
  console.log(`Seeded ${configs.length} system configs`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
