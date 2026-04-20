#!/usr/bin/env node
/**
 * Essential Database Seeding
 * Seeds membership tiers, regions, and system configs required for the platform to function.
 * Run after prisma migrate deploy and before setup-admin.js.
 *
 * Usage:
 *   node scripts/seed-essential.js
 */

const path = require('path');
const fs = require('fs');

// Load .env from apps/api/.env
const envPath = path.resolve(__dirname, '../apps/api/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length > 0 && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  });
  console.log('📄 Loaded environment from apps/api/.env');
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedMembershipTiers() {
  const tiers = [
    { level: 1, name: '普通会员', minCoins: 0n, regionalCoinRate: 0.0, description: 'Regular Member' },
    { level: 2, name: '健康大使', minCoins: 1000n, regionalCoinRate: 0.0, description: 'Health Ambassador' },
    { level: 3, name: '社区代理', minCoins: 5000n, regionalCoinRate: 0.20, description: 'Community Agent' },
    { level: 4, name: '县级代理', minCoins: 20000n, regionalCoinRate: 0.15, description: 'County Agent' },
    { level: 5, name: '市级代理', minCoins: 50000n, regionalCoinRate: 0.10, description: 'City Agent' },
    { level: 6, name: '省级代理', minCoins: 100000n, regionalCoinRate: 0.05, description: 'Provincial Agent' },
  ];

  console.log('🌱 Seeding membership tiers...');
  for (const tier of tiers) {
    await prisma.membershipTier.upsert({
      where: { level: tier.level },
      update: tier,
      create: tier,
    });
  }
  console.log(`   ✅ ${tiers.length} membership tiers seeded`);
}

async function seedRegions() {
  const regions = [
    { id: 'prov-bj', name: '北京市', code: '110000', level: 1, parentId: null },
    { id: 'prov-sh', name: '上海市', code: '310000', level: 1, parentId: null },
    { id: 'prov-gd', name: '广东省', code: '440000', level: 1, parentId: null },
    { id: 'prov-zj', name: '浙江省', code: '330000', level: 1, parentId: null },
    { id: 'prov-js', name: '江苏省', code: '320000', level: 1, parentId: null },
    { id: 'city-bj-dc', name: '东城区', code: '110101', level: 2, parentId: 'prov-bj' },
    { id: 'city-bj-xc', name: '西城区', code: '110102', level: 2, parentId: 'prov-bj' },
    { id: 'city-bj-cy', name: '朝阳区', code: '110105', level: 2, parentId: 'prov-bj' },
    { id: 'city-sh-hp', name: '黄浦区', code: '310101', level: 2, parentId: 'prov-sh' },
    { id: 'city-sh-xh', name: '徐汇区', code: '310104', level: 2, parentId: 'prov-sh' },
    { id: 'city-gz', name: '广州市', code: '440100', level: 2, parentId: 'prov-gd' },
    { id: 'city-sz', name: '深圳市', code: '440300', level: 2, parentId: 'prov-gd' },
    { id: 'county-gz-th', name: '天河区', code: '440106', level: 3, parentId: 'city-gz' },
    { id: 'county-gz-yx', name: '越秀区', code: '440104', level: 3, parentId: 'city-gz' },
    { id: 'county-sz-ft', name: '福田区', code: '440304', level: 3, parentId: 'city-sz' },
    { id: 'county-sz-ns', name: '南山区', code: '440305', level: 3, parentId: 'city-sz' },
  ];

  console.log('🌱 Seeding regions...');
  for (const region of regions) {
    await prisma.region.upsert({
      where: { code: region.code },
      update: {},
      create: region,
    });
  }
  console.log(`   ✅ ${regions.length} regions seeded`);
}

async function seedSystemConfigs() {
  const configs = [
    // ── Platform ──
    { key: 'platform_name', value: 'HealthCoin 健康币平台' },
    { key: 'platform_hotline', value: '400-888-6666' },
    { key: 'platform_wechat', value: 'healthcoin_official' },
    { key: 'platform_address', value: '上海市浦东新区张江高科技园区' },

    // ── Coin Rates ──
    { key: 'mutual_coin_own_rate', value: '0.5' },
    { key: 'mutual_coin_l1_rate', value: '0.25' },
    { key: 'mutual_coin_l2_rate', value: '0.1' },
    { key: 'health_coin_multiplier', value: '2.0' },
    { key: 'universal_coin_own_rate', value: '0.2' },
    { key: 'universal_coin_l1_rate', value: '0.1' },
    { key: 'withdrawal_commission_rate', value: '0.05' },
    { key: 'platform_commission_rate', value: '0.05' },

    // ── SMS / OTP ──
    { key: 'sms_provider', value: 'smsbao' },
    { key: 'sms_enabled', value: 'true' },
    { key: 'sms_template_code', value: 'SMS_12345678' },
    { key: 'sms_sign_name', value: '健康币平台' },
    // Note: smsbao_username/password/template are read from .env fallback
    // We leave them empty in DB so .env values are used securely
    { key: 'smsbao_username', value: '' },
    { key: 'smsbao_password', value: '' },
    { key: 'smsbao_template', value: '【健康币】您的验证码是[code]，5分钟内有效。' },
    { key: 'otp_expiry_seconds', value: '300' },
    { key: 'otp_resend_seconds', value: '60' },
    { key: 'otp_hourly_limit', value: '5' },

    // ── Payments ──
    { key: 'payment_provider_primary', value: 'fuiou' },
    { key: 'payment_fuiou_enabled', value: 'true' },
    { key: 'payment_wechat_enabled', value: 'false' },
    { key: 'payment_alipay_enabled', value: 'false' },
    { key: 'payment_lcsw_enabled', value: 'false' },
    { key: 'payment_coin_enabled', value: 'true' },

    // ── Order & Redemption ──
    { key: 'order_approval_required', value: 'false' },
    { key: 'product_review_required', value: 'true' },
    { key: 'redemption_code_valid_days', value: '30' },
    { key: 'allow_partial_redemption', value: 'true' },
  ];

  console.log('🌱 Seeding system configs...');
  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }
  console.log(`   ✅ ${configs.length} system configs seeded`);
}

async function main() {
  console.log('');
  console.log('🔧 Essential Database Seeding');
  console.log('==============================');
  console.log('');

  await seedMembershipTiers();
  await seedRegions();
  await seedSystemConfigs();

  console.log('');
  console.log('🎉 Essential seeding complete!');
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('');
    console.error('❌ Seeding error:', e.message);
    console.error(e.stack);
    await prisma.$disconnect();
    process.exit(1);
  });
