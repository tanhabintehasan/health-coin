-- Create product_audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS "product_audit_logs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "oldStatus" VARCHAR(20) NOT NULL,
    "newStatus" VARCHAR(20) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "product_audit_logs_productId_idx" ON "product_audit_logs"("productId");
CREATE INDEX IF NOT EXISTS "product_audit_logs_adminId_idx" ON "product_audit_logs"("adminId");

-- Add foreign key constraints if they don't exist
-- Note: using quoted column names to match Prisma camelCase convention
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'product_audit_logs_productId_fkey'
        AND table_name = 'product_audit_logs'
    ) THEN
        ALTER TABLE "product_audit_logs"
        ADD CONSTRAINT "product_audit_logs_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES "products"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'product_audit_logs_adminId_fkey'
        AND table_name = 'product_audit_logs'
    ) THEN
        ALTER TABLE "product_audit_logs"
        ADD CONSTRAINT "product_audit_logs_adminId_fkey"
        FOREIGN KEY ("adminId") REFERENCES "admin_users"("userId")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
