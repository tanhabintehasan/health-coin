# Fix Admin Dashboard 500 Error + BigInt Serialization
# Run this on the RDP server in C:\healthcoin

$ErrorActionPreference = "Stop"
$apiDir = "C:\healthcoin\apps\api"
$webDir = "C:\healthcoin\apps\web"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fixing Admin Dashboard + BigInt Issues" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Try to pull latest code
try {
    Set-Location C:\healthcoin
    git pull origin main
    Write-Host "Git pull successful." -ForegroundColor Green
} catch {
    Write-Host "Git pull failed (network issue). Applying patches manually..." -ForegroundColor Yellow

    # Patch 1: main.ts - Add BigInt.prototype.toJSON
    $mainTs = Get-Content "$apiDir\src\main.ts" -Raw
    if ($mainTs -notmatch "BigInt\.prototype.*toJSON") {
        $mainTs = $mainTs -replace "import \{ AllExceptionsFilter \} from '\.\/common\/filters\/all-exceptions\.filter';",
            "import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';`n`n// Global safety net: ensure BigInt always serializes to string in JSON`n(BigInt.prototype as any).toJSON = function () {`n  return this.toString();`n};"
        Set-Content "$apiDir\src\main.ts" $mainTs -NoNewline
        Write-Host "Patched main.ts" -ForegroundColor Green
    }

    # Patch 2: bigint-serialize.interceptor.ts - Handle Prisma Decimal
    $interceptor = Get-Content "$apiDir\src\common\interceptors\bigint-serialize.interceptor.ts" -Raw
    if ($interceptor -notmatch "constructor\?\.name === 'Decimal'") {
        $interceptor = $interceptor -replace "if \(value instanceof Date\) \{\n    return value\.toISOString\(\);\n  \}",
            "if (value instanceof Date) {`n    return value.toISOString();`n  }`n  // Handle Prisma Decimal (decimal.js) — preserve as string instead of expanding internal props`n  if (value !== null && typeof value === 'object' && value.constructor?.name === 'Decimal' && typeof value.toString === 'function') {`n    return value.toString();`n  }"
        Set-Content "$apiDir\src\common\interceptors\bigint-serialize.interceptor.ts" $interceptor -NoNewline
        Write-Host "Patched bigint-serialize.interceptor.ts" -ForegroundColor Green
    }

    # Patch 3: admin.controller.ts listOrders - Serialize all BigInt/Decimal fields
    $adminCtrl = Get-Content "$apiDir\src\modules\admin\admin.controller.ts" -Raw
    if ($adminCtrl -notmatch "healthCoinPaid: o\.healthCoinPaid\.toString\(\)") {
        $old = "data: data.map((o) => ({ ...o, totalAmount: o.totalAmount.toString() })),"
        $new = "data: data.map((o) => ({`n        ...o,`n        totalAmount: o.totalAmount.toString(),`n        healthCoinPaid: o.healthCoinPaid.toString(),`n        mutualCoinPaid: o.mutualCoinPaid.toString(),`n        universalCoinPaid: o.universalCoinPaid.toString(),`n        cashPaid: o.cashPaid.toString(),`n        coinOffsetRate: Number(o.coinOffsetRate ?? 0),`n      })),"
        $adminCtrl = $adminCtrl -replace [regex]::Escape($old), $new
        Set-Content "$apiDir\src\modules\admin\admin.controller.ts" $adminCtrl -NoNewline
        Write-Host "Patched admin.controller.ts" -ForegroundColor Green
    }
}

# 2. Fix database
try {
    Write-Host "`nRunning database fixes..." -ForegroundColor Cyan

    # Check if psql is available
    $psql = & where.exe psql 2>$null
    if (-not $psql) {
        # Try common PostgreSQL paths
        $pgPaths = @(
            "C:\Program Files\PostgreSQL\15\bin\psql.exe",
            "C:\Program Files\PostgreSQL\14\bin\psql.exe",
            "C:\Program Files\PostgreSQL\16\bin\psql.exe"
        )
        foreach ($p in $pgPaths) {
            if (Test-Path $p) { $psql = $p; break }
        }
    }

    if (-not $psql) {
        Write-Host "WARNING: psql not found. Please run the SQL manually (see below)." -ForegroundColor Red
    } else {
        $env:PGPASSWORD = "coin@Health.12345"
        $sql = @"
-- Ensure mall_default_coin_offset_rate config exists
INSERT INTO system_configs (key, value, "updatedAt") VALUES ('mall_default_coin_offset_rate', '0.0', NOW())
ON CONFLICT (key) DO UPDATE SET value = '0.0', "updatedAt" = NOW();

-- Fix membership tier thresholds (raw yuan -> cents ×100)
UPDATE "membership_tiers" SET "minCoins" = 0 WHERE level = 1;
UPDATE "membership_tiers" SET "minCoins" = 100000 WHERE level = 2;
UPDATE "membership_tiers" SET "minCoins" = 500000 WHERE level = 3;
UPDATE "membership_tiers" SET "minCoins" = 1000000 WHERE level = 4;
UPDATE "membership_tiers" SET "minCoins" = 3000000 WHERE level = 5;
UPDATE "membership_tiers" SET "minCoins" = 5000000 WHERE level = 6;

-- Verify
SELECT key, value FROM system_configs WHERE key = 'mall_default_coin_offset_rate';
SELECT level, name, "minCoins" FROM "membership_tiers" ORDER BY level;
"@
        $sql | & $psql -U postgres -d healthcoin_db -a -f - 2>&1
        Write-Host "Database fixes applied." -ForegroundColor Green
    }
} catch {
    Write-Host "Database fix failed: $_" -ForegroundColor Red
    Write-Host "Please run the SQL manually using pgAdmin or psql." -ForegroundColor Yellow
}

# 3. Build API
Write-Host "`nBuilding API..." -ForegroundColor Cyan
Set-Location $apiDir
try {
    npm run build 2>&1
    Write-Host "API build successful." -ForegroundColor Green
} catch {
    Write-Host "API build failed: $_" -ForegroundColor Red
    exit 1
}

# 4. Build Web
Write-Host "`nBuilding Web..." -ForegroundColor Cyan
Set-Location $webDir
try {
    npm run build 2>&1
    Write-Host "Web build successful." -ForegroundColor Green
} catch {
    Write-Host "Web build failed: $_" -ForegroundColor Red
    # Don't exit - API is more critical
}

# 5. Restart PM2
Write-Host "`nRestarting PM2 services..." -ForegroundColor Cyan
pm2 restart healthcoin-api --update-env 2>&1
pm2 restart healthcoin-proxy --update-env 2>&1
pm2 save 2>&1
Write-Host "PM2 services restarted." -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Fix complete! Please test the admin dashboard." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
