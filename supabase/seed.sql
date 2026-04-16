-- =====================================================
-- HealthCoin Essential Seed Data
-- Run this after schema.sql in Supabase SQL Editor
-- =====================================================

-- -----------------------------------------------------
-- 1. Regions
-- -----------------------------------------------------
INSERT INTO "regions" ("id", "name", "code", "level") VALUES
  ('prov-sh', '上海市', '310000', 1),
  ('prov-bj', '北京市', '110000', 1)
ON CONFLICT ("id") DO NOTHING;

-- -----------------------------------------------------
-- 2. Membership Tiers
-- -----------------------------------------------------
INSERT INTO "membership_tiers" ("level", "name", "minCoins", "regionalCoinRate", "description") VALUES
  (1, '普通会员', 0,      0.00, 'Regular Member'),
  (2, '健康大使', 1000,   0.00, 'Health Ambassador'),
  (3, '社区代理', 5000,   0.20, 'Community Agent'),
  (4, '县级代理', 20000,  0.15, 'County Agent'),
  (5, '市级代理', 50000,  0.10, 'City Agent'),
  (6, '省级代理', 100000, 0.05, 'Provincial Agent')
ON CONFLICT ("level") DO NOTHING;

-- -----------------------------------------------------
-- 3. System Configs (OTP / SMS / Payments / Platform)
-- -----------------------------------------------------
INSERT INTO "system_configs" ("key", "value") VALUES
  ('mutual_coin_own_rate', '0.5'),
  ('mutual_coin_l1_rate', '0.25'),
  ('mutual_coin_l2_rate', '0.1'),
  ('health_coin_multiplier', '2.0'),
  ('universal_coin_own_rate', '0.2'),
  ('universal_coin_l1_rate', '0.1'),
  ('withdrawal_commission_rate', '0.05'),
  ('platform_commission_rate', '0.05'),
  ('order_approval_required', 'false'),
  ('product_review_required', 'true'),
  ('redemption_code_valid_days', '30'),
  ('allow_partial_redemption', 'true'),
  ('sms_provider', 'smsbao'),
  ('sms_enabled', 'true'),
  ('sms_template_code', 'SMS_12345678'),
  ('sms_sign_name', '健康币平台'),
  ('otp_expiry_seconds', '300'),
  ('otp_resend_seconds', '60'),
  ('otp_hourly_limit', '5'),
  ('payment_provider_primary', 'fuiou'),
  ('payment_fuiou_enabled', 'true'),
  ('payment_wechat_enabled', 'false'),
  ('payment_alipay_enabled', 'false'),
  ('payment_coin_enabled', 'true'),
  ('platform_name', 'HealthCoin 健康币平台'),
  ('platform_hotline', '400-888-6666'),
  ('platform_wechat', 'healthcoin_official'),
  ('platform_address', '上海市浦东新区张江高科技园区')
ON CONFLICT ("key") DO NOTHING;

-- -----------------------------------------------------
-- 4. Demo Users (for demo-login and testing)
-- -----------------------------------------------------
INSERT INTO "users" ("id", "phone", "nickname", "referralCode", "regionId", "membershipLevel", "isActive") VALUES
  ('demo-admin',  '13800000001', '管理员',   'ADMIN000', 'prov-sh', 1, true),
  ('demo-merchant','13800000002', '张商户',   'MERCH000', 'prov-sh', 2, true),
  ('demo-merchant2','13800000003','李商户',   'MERCH001', 'prov-bj', 2, true),
  ('demo-user',   '13800000004', '会员小王', 'USER0000', 'prov-sh', 1, true),
  ('demo-user2',  '13800000005', '会员小刘', 'USER0001', 'prov-sh', 3, true),
  ('demo-user3',  '13800000006', '会员小陈', 'USER0002', 'prov-sh', 1, true)
ON CONFLICT ("phone") DO NOTHING;

-- -----------------------------------------------------
-- 5. Wallets for demo users
-- -----------------------------------------------------
INSERT INTO "wallets" ("userId", "walletType", "balance") VALUES
  ('demo-admin',   'HEALTH_COIN', 50000),
  ('demo-admin',   'MUTUAL_HEALTH_COIN', 30000),
  ('demo-admin',   'UNIVERSAL_HEALTH_COIN', 20000),
  ('demo-merchant','HEALTH_COIN', 45000),
  ('demo-merchant','MUTUAL_HEALTH_COIN', 28000),
  ('demo-merchant','UNIVERSAL_HEALTH_COIN', 15000),
  ('demo-user',    'HEALTH_COIN', 12000),
  ('demo-user',    'MUTUAL_HEALTH_COIN', 8000),
  ('demo-user',    'UNIVERSAL_HEALTH_COIN', 5000)
ON CONFLICT ("userId", "walletType") DO NOTHING;

-- -----------------------------------------------------
-- 6. Admin record
-- -----------------------------------------------------
INSERT INTO "admin_users" ("userId", "role", "permissions") VALUES
  ('demo-admin', 'SUPER_ADMIN', ARRAY['*'])
ON CONFLICT ("userId") DO NOTHING;

-- -----------------------------------------------------
-- 7. Demo Merchants
-- -----------------------------------------------------
INSERT INTO "merchants" ("ownerUserId", "name", "description", "regionId", "status", "commissionRate", "approvedAt") VALUES
  ('demo-merchant', '康健大药房', '专注家庭健康护理，正品保障，极速发货', 'prov-sh', 'APPROVED', 0.05, NOW()),
  ('demo-merchant2','绿源有机食品', '源头直采有机食材，会员专享优惠', 'prov-bj', 'APPROVED', 0.06, NOW())
ON CONFLICT ("ownerUserId") DO NOTHING;

-- -----------------------------------------------------
-- 8. Product Categories
-- -----------------------------------------------------
INSERT INTO "product_categories" ("id", "name", "sortOrder") VALUES
  ('cat-health',  '健康护理', 1),
  ('cat-food',    '有机食品', 2),
  ('cat-service', '健康服务', 3)
ON CONFLICT ("id") DO NOTHING;
