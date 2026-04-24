-- Add coinOffsetRate column to orders table
ALTER TABLE orders ADD COLUMN "coinOffsetRate" DECIMAL(5,4) NOT NULL DEFAULT 0.0;

-- Add new system config for global mall default offset rate
INSERT INTO system_configs (key, value) VALUES ('mall_default_coin_offset_rate', '0.0')
ON CONFLICT (key) DO UPDATE SET value = '0.0';

-- Fix existing seeded tier thresholds (if they were seeded with raw values)
-- Only run this if you previously seeded with the old incorrect values
-- UPDATE membership_tiers SET min_coins = min_coins * 100 WHERE min_coins < 100000;
