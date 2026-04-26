#Requires -Version 5.1
<#
.SYNOPSIS
    HealthCoin — Complete Fresh Deployment
.DESCRIPTION
    Run this ONCE on the RDP server after pulling latest code from GitHub.
    It sets up the database, creates .env, seeds data, and starts services.
#>
$ErrorActionPreference = "Stop"

$AppDir = "C:\healthcoin"
$DbName = "healthcoin_db"
$DbUser = "healthcoin_user"
$ApiPort = 3000

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
LCSW_MERCHANT_NO=
LCSW_APPID=
LCSW_APP_SECRET=
LCSW_ACCESS_TOKEN=
LCSW_BASE_URL=https://openapi.lcsw.cn
LCSW_ENCRYPTION_KEY=$LcswKey
WECHAT_MINI_APPID=
WECHAT_MINI_SECRET=
WECHAT_APPID=
WECHAT_SECRET=
SMSBAO_USERNAME=
SMSBAO_PASSWORD=
SMSBAO_TEMPLATE=【健康币】您的验证码是[code]，5分钟内有效。
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

# ── 7. Admin Setup ────────────────────────────────────────────────────────────
Write-Step "Creating Admin Account"
$env:ADMIN_PHONE = $AdminPhone
$env:ADMIN_PASSWORD = $AdminPasswordPlain
$env:ADMIN_NICKNAME = "Administrator"
node scripts\setup-admin.js
if ($LASTEXITCODE -ne 0) { Write-Err "Admin setup failed" }
Write-Ok "Admin account ready"

# ── 8. Build ──────────────────────────────────────────────────────────────────
Write-Step "Building Applications"

Set-Location "$AppDir\apps\api"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "API build failed" }
Write-Ok "API build complete"

Set-Location "$AppDir\apps\web"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "Web build failed" }
Write-Ok "Web build complete"

# ── 9. Stop old services ──────────────────────────────────────────────────────
Write-Step "Stopping Old Services"
pm2 delete healthcoin-api 2>$null
pm2 delete healthcoin-proxy 2>$null
Start-Sleep -Seconds 2
Write-Ok "Old services cleaned"

# ── 10. Start Services ────────────────────────────────────────────────────────
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
Write-Host "NEXT STEP:" -ForegroundColor Yellow
Write-Host "  Run .\DEPLOY\02-configure-payments.ps1" -ForegroundColor White
Write-Host "  to set up LCSW, SMS, and WeChat credentials." -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
