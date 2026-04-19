#Requires -RunAsAdministrator
<#
.SYNOPSIS
    HealthCoin — Full Update Script (Previous + Current Security Fixes)
.DESCRIPTION
    This script updates an ALREADY DEPLOYED HealthCoin instance with ALL features
    from the previous update (password auth, WeChat login, profile expansion, OSS)
    PLUS the current security hardening (JWT fixes, rate limiting, demo removal,
    pagination limits, CORS fixes, webhook hardening, contact form).
    
    Run this INSIDE your RDP session on the already-deployed server.
    
    PREREQUISITE: You must have already run deploy-windows.ps1 successfully.
#>
param(
    [string]$AppDir = "C:\healthcoin",
    [string]$AdminPhone = "13266893239",
    [string]$AdminPassword = "coin@Health.12345"
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host $msg -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
}
function Write-Ok($msg)  { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg){ Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[ERR] $msg" -ForegroundColor Red }

# =============================================================================
# 0. Validation
# =============================================================================
Write-Step "Validating Existing Deployment"

if (-not (Test-Path $AppDir)) {
    Write-Err "$AppDir does not exist. You must run deploy-windows.ps1 first before running this update."
    exit 1
}

if (-not (Test-Path "$AppDir\.git")) {
    Write-Err "$AppDir is not a git repository. Cannot update."
    exit 1
}

Write-Ok "Existing deployment found at $AppDir"

# =============================================================================
# 1. Stop Services
# =============================================================================
Write-Step "Step 1/8 — Stopping Services"
cd $AppDir
pm2 stop all 2>$null
Write-Ok "Services stopped"

# =============================================================================
# 2. Pull Latest Code
# =============================================================================
Write-Step "Step 2/8 — Pulling Latest Code"
cd $AppDir
git stash 2>$null
git pull origin main
Write-Ok "Latest code pulled"

# =============================================================================
# 3. Install Dependencies
# =============================================================================
Write-Step "Step 3/8 — Installing Dependencies"

cd $AppDir
npm install

# Ensure API dependencies are present
cd "$AppDir\apps\api"
npm install

# Ensure mini-program dependencies are present
cd "$AppDir\apps\miniprogram"
npm install

Write-Ok "Dependencies installed"

# =============================================================================
# 4. Update Environment Files
# =============================================================================
Write-Step "Step 4/8 — Updating Environment Files"

$apiEnvPath = "$AppDir\apps\api\.env"
$webEnvPath = "$AppDir\apps\web\.env"

function Ensure-EnvVar($path, $key, $defaultValue = "") {
    $content = Get-Content $path -Raw -ErrorAction SilentlyContinue
    if (-not $content) { $content = "" }
    if ($content -notmatch "^$key=[^\r\n]*") {
        Add-Content -Path $path -Value "$key=$defaultValue" -Encoding UTF8
        Write-Ok "Added $key to $(Split-Path $path -Leaf)"
    }
}

# ---- API .env required new vars ----
Ensure-EnvVar $apiEnvPath "JWT_SECRET" "change-me-to-a-random-string-min-32-chars"
Ensure-EnvVar $apiEnvPath "JWT_REFRESH_SECRET" "change-me-to-another-random-string-min-32-chars"
Ensure-EnvVar $apiEnvPath "JWT_EXPIRES_IN" "2h"
Ensure-EnvVar $apiEnvPath "JWT_REFRESH_EXPIRES_IN" "7d"
Ensure-EnvVar $apiEnvPath "CORS_ORIGINS" ""
Ensure-EnvVar $apiEnvPath "ADMIN_PHONE" $AdminPhone
Ensure-EnvVar $apiEnvPath "ADMIN_PASSWORD" $AdminPassword
Ensure-EnvVar $apiEnvPath "ADMIN_NICKNAME" "Administrator"

# Payment vars (empty placeholders — user must fill)
Ensure-EnvVar $apiEnvPath "FUIOU_MERCHANT_NO" ""
Ensure-EnvVar $apiEnvPath "FUIOU_API_KEY" ""
Ensure-EnvVar $apiEnvPath "FUIOU_GATEWAY_URL" "https://pay.fuiou.com"
Ensure-EnvVar $apiEnvPath "FUIOU_MOCK_PAYMENTS" "false"
Ensure-EnvVar $apiEnvPath "LCSW_MERCHANT_NO" ""
Ensure-EnvVar $apiEnvPath "LCSW_APPID" ""
Ensure-EnvVar $apiEnvPath "LCSW_APP_SECRET" ""
Ensure-EnvVar $apiEnvPath "LCSW_ACCESS_TOKEN" ""
Ensure-EnvVar $apiEnvPath "LCSW_BASE_URL" "https://openapi.lcsw.cn"
Ensure-EnvVar $apiEnvPath "LCSW_ENCRYPTION_KEY" ""

# WeChat vars
Ensure-EnvVar $apiEnvPath "WECHAT_APPID" ""
Ensure-EnvVar $apiEnvPath "WECHAT_SECRET" ""
Ensure-EnvVar $apiEnvPath "WECHAT_MINI_APPID" ""
Ensure-EnvVar $apiEnvPath "WECHAT_MINI_SECRET" ""

# SMS
Ensure-EnvVar $apiEnvPath "SMSBAO_USERNAME" ""
Ensure-EnvVar $apiEnvPath "SMSBAO_PASSWORD" ""

# OSS
Ensure-EnvVar $apiEnvPath "OSS_REGION" ""
Ensure-EnvVar $apiEnvPath "OSS_ACCESS_KEY_ID" ""
Ensure-EnvVar $apiEnvPath "OSS_ACCESS_KEY_SECRET" ""
Ensure-EnvVar $apiEnvPath "OSS_BUCKET" ""
Ensure-EnvVar $apiEnvPath "OSS_ENDPOINT" ""

# ---- Remove old demo vars if present ----
$apiContent = Get-Content $apiEnvPath -Raw
if ($apiContent -match "DEMO_LOGIN_ENABLED") {
    $apiContent = $apiContent -replace "DEMO_LOGIN_ENABLED=.*\r?\n?", ""
    Set-Content -Path $apiEnvPath -Value $apiContent -Encoding UTF8
    Write-Ok "Removed DEMO_LOGIN_ENABLED from API .env"
}

# ---- Web .env ----
Ensure-EnvVar $webEnvPath "VITE_API_BASE_URL" "http://localhost:3000/api/v1"
$webContent = Get-Content $webEnvPath -Raw
if ($webContent -match "VITE_DEMO_LOGIN_ENABLED") {
    $webContent = $webContent -replace "VITE_DEMO_LOGIN_ENABLED=.*\r?\n?", ""
    Set-Content -Path $webEnvPath -Value $webContent -Encoding UTF8
    Write-Ok "Removed VITE_DEMO_LOGIN_ENABLED from Web .env"
}

Write-Warn "Please review and fill in all empty values in $apiEnvPath before going to production!"
Write-Ok "Environment files updated"

# =============================================================================
# 5. Database Migration
# =============================================================================
Write-Step "Step 5/8 — Running Database Migration"

cd "$AppDir\apps\api"
npx prisma generate
npx prisma migrate deploy
Write-Ok "Database migrations complete"

# =============================================================================
# 6. Setup Admin Account
# =============================================================================
Write-Step "Step 6/8 — Setting Up Admin Account"

cd $AppDir
$env:ADMIN_PHONE = $AdminPhone
$env:ADMIN_PASSWORD = $AdminPassword
$env:ADMIN_NICKNAME = "Administrator"
node scripts\setup-admin.js

# =============================================================================
# 7. Build All Applications
# =============================================================================
Write-Step "Step 7/8 — Building All Applications"

cd "$AppDir\apps\api"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "API build failed"; exit 1 }
Write-Ok "API build complete"

cd "$AppDir\apps\web"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "Web build failed"; exit 1 }
Write-Ok "Web build complete"

cd "$AppDir\apps\miniprogram"
npm run build:weapp
if ($LASTEXITCODE -ne 0) { Write-Err "Mini-program build failed"; exit 1 }
Write-Ok "Mini-program build complete"

# =============================================================================
# 8. Restart Services
# =============================================================================
Write-Step "Step 8/8 — Restarting Services"

cd $AppDir

# Stop IIS if running
iisreset /stop 2>$null
Stop-Service W3SVC -ErrorAction SilentlyContinue

# Restart API via PM2
pm2 delete healthcoin-api 2>$null
pm2 start "$AppDir\apps\api\dist\src\main.js" --name healthcoin-api --restart-delay 3000 --max-restarts 5

# Restart Proxy via PM2
pm2 delete healthcoin-proxy 2>$null
pm2 start "$AppDir\proxy-server.js" --name healthcoin-proxy

pm2 save
Write-Ok "Services restarted"

# =============================================================================
# Done
# =============================================================================
Write-Step "Update Complete!"
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  ✅ All security fixes applied" -ForegroundColor Cyan
Write-Host "  ✅ All new features enabled" -ForegroundColor Cyan
Write-Host "  ✅ Admin account created/updated" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Admin Login:" -ForegroundColor Yellow
Write-Host "  Phone:    $AdminPhone" -ForegroundColor White
Write-Host "  Password: $AdminPassword" -ForegroundColor White
Write-Host ""
Write-Host "CRITICAL: Before going to production, fill in these .env values:" -ForegroundColor Red
Write-Host "  • JWT_SECRET & JWT_REFRESH_SECRET (long random strings)" -ForegroundColor White
Write-Host "  • CORS_ORIGINS (your actual domains, NOT localhost)" -ForegroundColor White
Write-Host "  • FUIOU_MERCHANT_NO & FUIOU_API_KEY" -ForegroundColor White
Write-Host "  • LCSW_MERCHANT_NO, LCSW_APPID, LCSW_ACCESS_TOKEN" -ForegroundColor White
Write-Host "  • WECHAT_MINI_APPID & WECHAT_MINI_SECRET (for mini-program login)" -ForegroundColor White
Write-Host "  • WECHAT_APPID & WECHAT_SECRET (for web QR login)" -ForegroundColor White
Write-Host "  • SMSBAO_USERNAME & SMSBAO_PASSWORD" -ForegroundColor White
Write-Host "  • OSS credentials (for file uploads)" -ForegroundColor White
Write-Host ""
Write-Host "After editing .env, restart services:" -ForegroundColor Yellow
Write-Host "  cd $AppDir; pm2 restart all" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
