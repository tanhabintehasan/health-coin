#Requires -Version 5.1
<#
.SYNOPSIS
    HealthCoin — Complete Fresh Deployment (RDP Optimized)
.DESCRIPTION
    Run this ONCE on the RDP server after pulling latest code from GitHub.
    It sets up the database, creates .env, seeds data, inserts payment config,
    builds applications, and starts PM2 services.
#>
$ErrorActionPreference = "Stop"

$AppDir = "C:\healthcoin"
$DbName = "healthcoin_db"
$DbUser = "healthcoin_user"
$ApiPort = 3000

# ── Pre-configured credentials (DO NOT MODIFY) ────────────────────────────────
$LcswMerchantNo = '858404816000329'
$LcswTerminalId = '19750857'
$LcswAccessToken = 'ce55099502be4106a38890be2e4fe787'
$LcswBaseUrl = 'http://pay.lcsw.cn/lcsw'
$SmsbaoUsername = 'CX3308'
$SmsbaoPassword = 'd246e48c94264b2f8a2dbe17877e8a7d'
$SmsbaoTemplate = '【健康币】您的验证码是[code]，5分钟内有效。'

function Write-Step($msg) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host $msg -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}
function Write-Ok($msg)  { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg){ Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[ERR] $msg" -ForegroundColor Red; exit 1 }

# ── 0. Verify project location ────────────────────────────────────────────────
Write-Step "HealthCoin Fresh Deployment"

if (-not (Test-Path "$AppDir\package.json")) {
    Write-Err "Project not found at $AppDir. Did you clone the repo?"
}
Write-Ok "Project found"

# ── 1. Prompts ────────────────────────────────────────────────────────────────
Write-Step "Configuration"

$ServerIp = Read-Host -Prompt "Server IP (e.g. 39.98.241.141)"
if ([string]::IsNullOrWhiteSpace($ServerIp)) { $ServerIp = "39.98.241.141" }

$DbPassword = Read-Host -Prompt "PostgreSQL password for user '$DbUser'" -AsSecureString
$DbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DbPassword))

$AdminPhone = Read-Host -Prompt "Admin phone number"
if ([string]::IsNullOrWhiteSpace($AdminPhone)) { $AdminPhone = "13266893239" }

$AdminPassword = Read-Host -Prompt "Admin password" -AsSecureString
$AdminPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AdminPassword))

$JwtSecret = Read-Host -Prompt "JWT_SECRET (min 32 chars, or press Enter to auto-generate)"
if ([string]::IsNullOrWhiteSpace($JwtSecret)) {
    $JwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
    Write-Host "Auto-generated JWT_SECRET: $JwtSecret" -ForegroundColor Yellow
}

$JwtRefresh = Read-Host -Prompt "JWT_REFRESH_SECRET (min 32 chars, or press Enter to auto-generate)"
if ([string]::IsNullOrWhiteSpace($JwtRefresh)) {
    $JwtRefresh = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
    Write-Host "Auto-generated JWT_REFRESH_SECRET: $JwtRefresh" -ForegroundColor Yellow
}

$LcswKey = Read-Host -Prompt "LCSW_ENCRYPTION_KEY (min 16 chars, or press Enter to auto-generate)"
if ([string]::IsNullOrWhiteSpace($LcswKey)) {
    $LcswKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    Write-Host "Auto-generated LCSW_ENCRYPTION_KEY: $LcswKey" -ForegroundColor Yellow
}

# ── 2. Install dependencies ───────────────────────────────────────────────────
Write-Step "Installing Dependencies"
Set-Location $AppDir
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { Write-Err "npm install failed" }
Write-Ok "Dependencies installed"

# ── 3. Create .env files ──────────────────────────────────────────────────────
Write-Step "Creating Environment Files"

$apiEnv = @"
NODE_ENV=production
PORT=$ApiPort
DATABASE_URL=postgresql://$DbUser`:$DbPasswordPlain@localhost:5432/$DbName
JWT_SECRET=$JwtSecret
JWT_REFRESH_SECRET=$JwtRefresh
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=*
APP_URL=http://$ServerIp
CRON_SECRET=$JwtSecret
ADMIN_PHONE=$AdminPhone
ADMIN_PASSWORD=$AdminPasswordPlain
ADMIN_NICKNAME=Administrator
FUIOU_MERCHANT_NO=
FUIOU_API_KEY=
FUIOU_GATEWAY_URL=https://pay.fuiou.com
FUIOU_MOCK_PAYMENTS=false
LCSW_ENCRYPTION_KEY=$LcswKey
WECHAT_MINI_APPID=
WECHAT_MINI_SECRET=
WECHAT_APPID=
WECHAT_SECRET=
SMSBAO_USERNAME=$SmsbaoUsername
SMSBAO_PASSWORD=$SmsbaoPassword
SMSBAO_TEMPLATE=$SmsbaoTemplate
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
PLATFORM_NAME=HealthCoin
PLATFORM_COMMISSION_RATE=0.05
"@
Set-Content -Path "$AppDir\apps\api\.env" -Value $apiEnv -Encoding UTF8

$webEnv = "VITE_API_BASE_URL=http://$ServerIp/api/v1"
Set-Content -Path "$AppDir\apps\web\.env" -Value $webEnv -Encoding UTF8
Write-Ok "Environment files created"

# ── 4. Database Setup ─────────────────────────────────────────────────────────
Write-Step "Database Setup"
$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$psql = "$pgBin\psql.exe"
if (-not (Test-Path $psql)) {
    $psql = (where.exe psql 2>$null)
    if (-not $psql) { Write-Err "psql not found. Install PostgreSQL 17." }
}

$env:PGPASSWORD = $DbPasswordPlain

# Create user if not exists
& $psql -U postgres -c "DO `\$\$` BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DbUser') THEN CREATE USER $DbUser WITH PASSWORD '$DbPasswordPlain'; END IF; END `\$\$`;"
if ($LASTEXITCODE -ne 0) { Write-Warn "User creation may have failed (likely already exists)" }

# Create database if not exists
& $psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname = '$DbName'" | Out-Null
$dbExists = $LASTEXITCODE -eq 0
if (-not $dbExists) {
    & $psql -U postgres -c "CREATE DATABASE $DbName OWNER $DbUser;"
} else {
    Write-Warn "Database $DbName already exists"
}

# Grant privileges
& $psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;"
& $psql -U postgres -d $DbName -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
Write-Ok "Database ready"

# ── 5. Prisma ─────────────────────────────────────────────────────────────────
Write-Step "Prisma Generate & Migrate"
Set-Location "$AppDir\apps\api"

npm run prisma:generate
if ($LASTEXITCODE -ne 0) { Write-Err "prisma generate failed" }
Write-Ok "Prisma client generated"

npm run prisma:migrate:deploy
if ($LASTEXITCODE -ne 0) { Write-Err "prisma migrate deploy failed" }
Write-Ok "Database migrations applied"

# ── 6. Seed Data ──────────────────────────────────────────────────────────────
Write-Step "Seeding Essential Data"
Set-Location $AppDir
node scripts\seed-essential.js
if ($LASTEXITCODE -ne 0) { Write-Err "Essential seeding failed" }
Write-Ok "Essential data seeded"

# ── 7. Insert Payment & SMS Configs ───────────────────────────────────────────
Write-Step "Inserting Payment & SMS Configuration"
$sql = @"
-- LCSW payment credentials (pre-configured)
INSERT INTO system_configs ("key", "value", "updatedAt") VALUES
('lcsw_merchant_no', '$LcswMerchantNo', NOW()),
('lcsw_terminal_id', '$LcswTerminalId', NOW()),
('lcsw_access_token', '$LcswAccessToken', NOW()),
('lcsw_base_url', '$LcswBaseUrl', NOW()),
('payment_lcsw_enabled', 'true', NOW()),
('payment_fuiou_enabled', 'false', NOW()),
('payment_wechat_enabled', 'false', NOW()),
('payment_alipay_enabled', 'false', NOW()),
('payment_coin_enabled', 'true', NOW()),
('payment_provider_primary', 'lcsw', NOW()),
('mall_default_coin_offset_rate', '0.5', NOW()),
('order_approval_required', 'false', NOW()),
('product_review_required', 'true', NOW()),
('redemption_code_valid_days', '30', NOW()),
('allow_partial_redemption', 'false', NOW()),
('platform_commission_rate', '0.05', NOW()),
('withdrawal_commission_rate', '0.02', NOW()),
('mutual_coin_own_rate', '0.10', NOW()),
('mutual_coin_l1_rate', '0.05', NOW()),
('mutual_coin_l2_rate', '0.03', NOW()),
('health_coin_multiplier', '1.0', NOW()),
('universal_coin_own_rate', '0.10', NOW()),
('universal_coin_l1_rate', '0.05', NOW())
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

-- SMSbao credentials (pre-configured)
INSERT INTO system_configs ("key", "value", "updatedAt") VALUES
('smsbao_username', '$SmsbaoUsername', NOW()),
('smsbao_password', '$SmsbaoPassword', NOW()),
('smsbao_template', '$SmsbaoTemplate', NOW()),
('sms_enabled', 'true', NOW()),
('otp_expiry_seconds', '300', NOW()),
('otp_resend_seconds', '60', NOW()),
('otp_hourly_limit', '10', NOW()),
('sms_provider', 'smsbao', NOW())
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

-- Verify
SELECT 'config' as type, "key", "value" FROM system_configs
WHERE "key" IN ('payment_lcsw_enabled','payment_fuiou_enabled','payment_coin_enabled','payment_provider_primary','lcsw_merchant_no','lcsw_terminal_id','sms_enabled','smsbao_username')
ORDER BY "key";
"@

$sql | & $psql -U postgres -d healthcoin_db -a -f -
Write-Ok "Payment & SMS configuration inserted"

# ── 8. Admin Setup ────────────────────────────────────────────────────────────
Write-Step "Creating Admin Account"
$env:ADMIN_PHONE = $AdminPhone
$env:ADMIN_PASSWORD = $AdminPasswordPlain
$env:ADMIN_NICKNAME = "Administrator"
node scripts\setup-admin.js
if ($LASTEXITCODE -ne 0) { Write-Err "Admin setup failed" }
Write-Ok "Admin account ready"

# ── 9. Build ──────────────────────────────────────────────────────────────────
Write-Step "Building Applications"

Set-Location "$AppDir\apps\api"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "API build failed" }
Write-Ok "API build complete"

Set-Location "$AppDir\apps\web"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "Web build failed" }
Write-Ok "Web build complete"

# ── 10. Stop old services ─────────────────────────────────────────────────────
Write-Step "Stopping Old Services"
pm2 delete healthcoin-api 2>$null
pm2 delete healthcoin-proxy 2>$null
Start-Sleep -Seconds 2
Write-Ok "Old services cleaned"

# ── 11. Start Services ────────────────────────────────────────────────────────
Write-Step "Starting Services"

Set-Location "$AppDir\apps\api"
pm2 start dist\src\main.js --name healthcoin-api --restart-delay 3000 --max-restarts 5
Write-Ok "API started on port $ApiPort"

Set-Location $AppDir
pm2 start proxy-server.js --name healthcoin-proxy
Write-Ok "Proxy started on port 80"

pm2 save
Write-Ok "PM2 config saved"

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Step "Deployment Complete!"
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Website:  http://$ServerIp/" -ForegroundColor Cyan
Write-Host "  API Docs: http://$ServerIp/api/docs" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Admin Login:" -ForegroundColor Yellow
Write-Host "  Phone:    $AdminPhone" -ForegroundColor White
Write-Host "  Password: $AdminPasswordPlain" -ForegroundColor White
Write-Host ""
Write-Host "LCSW Payment Config:" -ForegroundColor Yellow
Write-Host "  Merchant: $LcswMerchantNo" -ForegroundColor White
Write-Host "  Terminal: $LcswTerminalId" -ForegroundColor White
Write-Host "  Base URL: $LcswBaseUrl" -ForegroundColor White
Write-Host ""
Write-Host "SMS Config:" -ForegroundColor Yellow
Write-Host "  Provider: SMSbao" -ForegroundColor White
Write-Host "  Username: $SmsbaoUsername" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
