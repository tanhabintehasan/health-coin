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
  ('sms_template_code', ''),
  ('sms_sign_name', ''),
  ('smsbao_username', ''),
  ('smsbao_password', ''),
  ('smsbao_template', '【健康币】您的验证码是[code]，5分钟内有效。'),
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
-- 4. Demo Users REMOVED — use scripts/setup-admin.js to create admin
-- -----------------------------------------------------

-- -----------------------------------------------------
-- 5. Demo Wallets REMOVED
-- -----------------------------------------------------

-- -----------------------------------------------------
-- 6. Demo Admin record REMOVED
-- -----------------------------------------------------

-- -----------------------------------------------------
-- 7. Demo Merchants REMOVED
-- -----------------------------------------------------


-- -----------------------------------------------------
-- 8. Product Categories
-- -----------------------------------------------------
INSERT INTO "product_categories" ("id", "name", "sortOrder") VALUES
  ('cat-health',  '健康护理', 1),
  ('cat-food',    '有机食品', 2),
  ('cat-service', '健康服务', 3)
ON CONFLICT ("id") DO NOTHING;
