# Comprehensive Fix Script for HealthCoin Platform
# Run this on the RDP server in PowerShell

$ErrorActionPreference = "Stop"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HealthCoin Complete Fix & Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# --- 1. FIX DATABASE ---
Write-Host "`n[1/6] Fixing database..." -ForegroundColor Yellow
$env:PGPASSWORD = "coin@Health.12345"

# Find psql
$psql = (where.exe psql 2>$null); if (-not $psql) { $psql = "C:\Program Files\PostgreSQL\15\bin\psql.exe" }
if (-not (Test-Path $psql)) { $psql = "C:\Program Files\PostgreSQL\14\bin\psql.exe" }
if (-not (Test-Path $psql)) { $psql = "C:\Program Files\PostgreSQL\16\bin\psql.exe" }

if (-not (Test-Path $psql)) {
    Write-Host "ERROR: psql not found. Please install PostgreSQL client or run SQL manually in pgAdmin." -ForegroundColor Red
    exit 1
}

$sql = @"
-- Fix orders column name (Prisma expects camelCase coinOffsetRate)
DO 
\$\$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'coin_offset_rate') THEN
        ALTER TABLE orders RENAME COLUMN coin_offset_rate TO "coinOffsetRate";
        RAISE NOTICE 'Renamed coin_offset_rate to coinOffsetRate';
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'coinOffsetRate') THEN
        ALTER TABLE orders ADD COLUMN "coinOffsetRate" DECIMAL(5,4) NOT NULL DEFAULT 0.0;
        RAISE NOTICE 'Added coinOffsetRate column';
    ELSE
        RAISE NOTICE 'coinOffsetRate column already exists';
    END IF;
END
\$\$;

-- Insert LCSW payment credentials
INSERT INTO system_configs (key, value, "updatedAt") VALUES 
('lcsw_merchant_no', '858404816000329', NOW()),
('lcsw_terminal_id', '19750857', NOW()),
('lcsw_access_token', 'ce55099502be4106a38890be2e4fe787', NOW()),
('lcsw_base_url', 'http://pay.lcsw.cn/lcsw', NOW()),
('payment_lcsw_enabled', 'true', NOW()),
('payment_fuiou_enabled', 'false', NOW()),
('payment_coin_enabled', 'true', NOW()),
('payment_provider_primary', 'lcsw', NOW()),
('mall_default_coin_offset_rate', '0.0', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW();

-- Verify
SELECT 'column_ok' as check, column_name as key, data_type as value 
FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'coinOffsetRate'
UNION ALL
SELECT 'config_ok', key, value FROM system_configs WHERE key IN ('lcsw_merchant_no','payment_lcsw_enabled','mall_default_coin_offset_rate','payment_provider_primary');
"@

$sql | & $psql -U postgres -d healthcoin_db -a -f -
Write-Host "Database fixed." -ForegroundColor Green

# --- 2. PATCH FRONTEND PAYMENT REDIRECT ---
Write-Host "`n[2/6] Patching frontend payment redirect..." -ForegroundColor Yellow
$orderDetailPage = "C:\healthcoin\apps\web\src\pages\user\OrderDetailPage.tsx"
if (Test-Path $orderDetailPage) {
    $content = Get-Content $orderDetailPage -Raw
    if ($content -match "else if \(res\.payParams\) \{ message\.success\('支付参数已生成") {
        $old = @"
      if (res.payUrl) { window.open(res.payUrl, '_blank'); message.info('正在跳转支付...') }
      else if (res.payParams) { message.success('支付参数已生成，请在收银台完成支付'); fetchOrder() }
      else { message.success('支付成功'); fetchOrder() }
"@
        $new = @"
      if (res.payUrl) {
        window.open(res.payUrl, '_blank')
        message.info('正在跳转支付...')
      } else if (res.payParams) {
        const pp = res.payParams
        const payUrl = pp.jsapi_pay_url || pp.pay_url || pp.mweb_url || pp.gateway_url
        if (payUrl) {
          window.location.href = payUrl
        } else if (pp.qr_code || pp.code_url) {
          message.success('请使用微信扫码支付')
        } else {
          message.success('支付参数已生成，请在收银台完成支付')
          fetchOrder()
        }
      } else {
        message.success('支付成功')
        fetchOrder()
      }
"@
        $content = $content -replace [regex]::Escape($old), $new
        Set-Content $orderDetailPage $content -NoNewline
        Write-Host "Frontend patched." -ForegroundColor Green
    } else {
        Write-Host "Frontend already patched or file structure changed." -ForegroundColor Yellow
    }
} else {
    Write-Host "WARNING: OrderDetailPage.tsx not found at expected path." -ForegroundColor Red
}

# --- 3. STOP PM2 ---
Write-Host "`n[3/6] Stopping PM2..." -ForegroundColor Yellow
pm2 stop all
Start-Sleep -Seconds 3
Write-Host "PM2 stopped." -ForegroundColor Green

# --- 4. BUILD API ---
Write-Host "`n[4/6] Building API..." -ForegroundColor Yellow
Set-Location C:\healthcoin\apps\api
try {
    npm run build 2>&1
    Write-Host "API build successful." -ForegroundColor Green
} catch {
    Write-Host "API build failed: $_" -ForegroundColor Red
    exit 1
}

# --- 5. BUILD WEB ---
Write-Host "`n[5/6] Building Web..." -ForegroundColor Yellow
Set-Location C:\healthcoin\apps\web
try {
    npm run build 2>&1
    Write-Host "Web build successful." -ForegroundColor Green
} catch {
    Write-Host "Web build failed: $_" -ForegroundColor Red
}

# --- 6. RESTART PM2 ---
Write-Host "`n[6/6] Restarting PM2..." -ForegroundColor Yellow
pm2 restart all --update-env
pm2 save
Write-Host "PM2 restarted." -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ALL DONE! Test order creation + payment." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
