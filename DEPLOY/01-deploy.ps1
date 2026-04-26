#Requires -Version 5.1
# HealthCoin Complete Fresh Deployment (RDP Optimized)
# WARNING: Do NOT use Unicode characters in this file
$ErrorActionPreference = "Stop"

$AppDir = "C:\healthcoin"
$DbName = "healthcoin_db"
$DbUser = "healthcoin_user"
$ApiPort = 3000

# Pre-configured credentials
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

# --- 0. Verify project ---
Write-Step "HealthCoin Fresh Deployment"

if (-not (Test-Path "$AppDir\package.json")) {
    Write-Err "Project not found at $AppDir"
}
Write-Ok "Project found"

# --- 1. Prompts ---
Write-Step "Configuration"

$ServerIp = Read-Host -Prompt "Server IP (e.g. 39.98.241.141)"
if ([string]::IsNullOrWhiteSpace($ServerIp)) { $ServerIp = "39.98.241.141" }

Write-Host ""
$DbPassword = Read-Host -Prompt "PostgreSQL password"

Write-Host ""
$AdminPhone = Read-Host -Prompt "Admin phone number"
if ([string]::IsNullOrWhiteSpace($AdminPhone)) { $AdminPhone = "13266893239" }

Write-Host ""
$AdminPassword = Read-Host -Prompt "Admin password"

Write-Host ""
$JwtSecret = Read-Host -Prompt "JWT_SECRET (press Enter to auto-generate)"
if ([string]::IsNullOrWhiteSpace($JwtSecret)) {
    $JwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
    Write-Host "Auto-generated JWT_SECRET: $JwtSecret" -ForegroundColor Yellow
}

Write-Host ""
$JwtRefresh = Read-Host -Prompt "JWT_REFRESH_SECRET (press Enter to auto-generate)"
if ([string]::IsNullOrWhiteSpace($JwtRefresh)) {
    $JwtRefresh = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
    Write-Host "Auto-generated JWT_REFRESH_SECRET: $JwtRefresh" -ForegroundColor Yellow
}

Write-Host ""
$LcswKey = Read-Host -Prompt "LCSW_ENCRYPTION_KEY (press Enter to auto-generate)"
if ([string]::IsNullOrWhiteSpace($LcswKey)) {
    $LcswKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    Write-Host "Auto-generated LCSW_ENCRYPTION_KEY: $LcswKey" -ForegroundColor Yellow
}

# --- 2. Install dependencies ---
Write-Step "Installing Dependencies"
Set-Location $AppDir
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { Write-Err "npm install failed" }
Write-Ok "Dependencies installed"

# --- 3. Create .env files ---
Write-Step "Creating Environment Files"

$apiEnvContent = @"
NODE_ENV=production
PORT=$ApiPort
DATABASE_URL=postgresql://$DbUser`:$DbPassword@localhost:5432/$DbName
JWT_SECRET=$JwtSecret
JWT_REFRESH_SECRET=$JwtRefresh
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=*
APP_URL=http://$ServerIp
CRON_SECRET=$JwtSecret
ADMIN_PHONE=$AdminPhone
ADMIN_PASSWORD=$AdminPassword
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

[System.IO.File]::WriteAllText("$AppDir\apps\api\.env", $apiEnvContent)
[System.IO.File]::WriteAllText("$AppDir\apps\web\.env", "VITE_API_BASE_URL=http://$ServerIp/api/v1")
Write-Ok "Environment files created"

# --- 4. Database Setup ---
Write-Step "Database Setup"
$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$psql = "$pgBin\psql.exe"
if (-not (Test-Path $psql)) {
    $psql = (where.exe psql 2>$null)
    if (-not $psql) { Write-Err "psql not found. Install PostgreSQL 17." }
}

$env:PGPASSWORD = $DbPassword

# Create user if not exists (write SQL to temp file to avoid quote issues)
$createUserSql = "DO `$`$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DbUser') THEN CREATE USER $DbUser WITH PASSWORD '$DbPassword'; END IF; END `$`$;"
$tmpUserFile = "$env:TEMP\hc_createuser.sql"
[System.IO.File]::WriteAllText($tmpUserFile, $createUserSql)
& $psql -U postgres -f $tmpUserFile
if ($LASTEXITCODE -ne 0) { Write-Warn "User creation may have failed (likely already exists)" }

# Check if database exists
$dbCheckFile = "$env:TEMP\hc_dbcheck.sql"
[System.IO.File]::WriteAllText($dbCheckFile, "SELECT 1 FROM pg_database WHERE datname = '$DbName';")
$dbCheckResult = & $psql -U postgres -t -f $dbCheckFile
if ([string]::IsNullOrWhiteSpace($dbCheckResult)) {
    $createDbFile = "$env:TEMP\hc_createdb.sql"
    [System.IO.File]::WriteAllText($createDbFile, "CREATE DATABASE $DbName OWNER $DbUser;")
    & $psql -U postgres -f $createDbFile
    Write-Ok "Database created"
} else {
    Write-Warn "Database $DbName already exists"
}

# Grant privileges
$grantFile = "$env:TEMP\hc_grant.sql"
[System.IO.File]::WriteAllText($grantFile, "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser; CREATE EXTENSION IF NOT EXISTS `"uuid-ossp`";")
& $psql -U postgres -d $DbName -f $grantFile
Write-Ok "Database ready"

# --- 5. Prisma ---
Write-Step "Prisma Generate & Migrate"
Set-Location "$AppDir\apps\api"

npm run prisma:generate
if ($LASTEXITCODE -ne 0) { Write-Err "prisma generate failed" }
Write-Ok "Prisma client generated"

npm run prisma:migrate:deploy
if ($LASTEXITCODE -ne 0) { Write-Err "prisma migrate deploy failed" }
Write-Ok "Database migrations applied"

# --- 6. Seed Data ---
Write-Step "Seeding Essential Data"
Set-Location $AppDir
node scripts\seed-essential.js
if ($LASTEXITCODE -ne 0) { Write-Err "Essential seeding failed" }
Write-Ok "Essential data seeded"

# --- 7. Insert Payment & SMS Configs ---
Write-Step "Inserting Payment & SMS Configuration"

$paymentSqlContent = @"
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
"@

$tmpPaymentFile = "$env:TEMP\hc_payment.sql"
[System.IO.File]::WriteAllText($tmpPaymentFile, $paymentSqlContent)
& $psql -U postgres -d healthcoin_db -f $tmpPaymentFile
Write-Ok "Payment & SMS configuration inserted"

# --- 8. Admin Setup ---
Write-Step "Creating Admin Account"
$env:ADMIN_PHONE = $AdminPhone
$env:ADMIN_PASSWORD = $AdminPassword
$env:ADMIN_NICKNAME = "Administrator"
node scripts\setup-admin.js
if ($LASTEXITCODE -ne 0) { Write-Err "Admin setup failed" }
Write-Ok "Admin account ready"

# --- 9. Build ---
Write-Step "Building Applications"

Set-Location "$AppDir\apps\api"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "API build failed" }
Write-Ok "API build complete"

Set-Location "$AppDir\apps\web"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "Web build failed" }
Write-Ok "Web build complete"

# --- 10. Stop old services ---
Write-Step "Stopping Old Services"
pm2 delete healthcoin-api 2>$null
pm2 delete healthcoin-proxy 2>$null
Start-Sleep -Seconds 2
Write-Ok "Old services cleaned"

# --- 11. Start Services ---
Write-Step "Starting Services"

Set-Location "$AppDir\apps\api"
pm2 start dist\src\main.js --name healthcoin-api --restart-delay 3000 --max-restarts 5
Write-Ok "API started on port $ApiPort"

Set-Location $AppDir
pm2 start proxy-server.js --name healthcoin-proxy
Write-Ok "Proxy started on port 80"

pm2 save
Write-Ok "PM2 config saved"

# --- Done ---
Write-Step "Deployment Complete!"
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Website:  http://$ServerIp/" -ForegroundColor Cyan
Write-Host "  API Docs: http://$ServerIp/api/docs" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Admin Login:" -ForegroundColor Yellow
Write-Host "  Phone:    $AdminPhone" -ForegroundColor White
Write-Host "  Password: $AdminPassword" -ForegroundColor White
Write-Host ""
Write-Host "LCSW Payment:" -ForegroundColor Yellow
Write-Host "  Merchant: $LcswMerchantNo" -ForegroundColor White
Write-Host "  Terminal: $LcswTerminalId" -ForegroundColor White
Write-Host "  Base URL: $LcswBaseUrl" -ForegroundColor White
Write-Host ""
Write-Host "SMS:" -ForegroundColor Yellow
Write-Host "  Provider: SMSbao" -ForegroundColor White
Write-Host "  Username: $SmsbaoUsername" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
