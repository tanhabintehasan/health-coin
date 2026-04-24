-- Rename old snake_case column to camelCase if it exists (from earlier incorrect migration)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'coin_offset_rate'
    ) THEN
        ALTER TABLE orders RENAME COLUMN "coin_offset_rate" TO "coinOffsetRate";
    END IF;
END $$;

-- Add coinOffsetRate column to orders table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'coinOffsetRate'
    ) THEN
        ALTER TABLE orders ADD COLUMN "coinOffsetRate" DECIMAL(5,4) NOT NULL DEFAULT 0.0;
    END IF;
END $$;

-- Add new system config for global mall default offset rate
INSERT INTO system_configs (key, value) VALUES ('mall_default_coin_offset_rate', '0.0')
ON CONFLICT (key) DO UPDATE SET value = '0.0';
