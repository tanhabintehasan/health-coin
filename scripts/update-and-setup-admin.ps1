#Requires -RunAsAdministrator
<#
.SYNOPSIS
    HealthCoin — Update Existing Deployment + Setup Admin Account
.DESCRIPTION
    This script updates your ALREADY DEPLOYED HealthCoin instance with all new features
    (password auth, WeChat login, enhanced profile, OSS upload, mini-program fixes)
    and creates/updates the admin account with phone 13266893239 and password.
    
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
Write-Step "Step 1/7 — Stopping Services"
cd $AppDir
pm2 stop all 2>$null
Write-Ok "Services stopped"

# =============================================================================
# 2. Pull Latest Code
# =============================================================================
Write-Step "Step 2/7 — Pulling Latest Code"
cd $AppDir
git stash 2>$null
git pull origin main
Write-Ok "Latest code pulled"

# =============================================================================
# 3. Install New Dependencies
# =============================================================================
Write-Step "Step 3/7 — Installing New Dependencies"

cd $AppDir
npm install

# API new dependencies
cd "$AppDir\apps\api"
npm install ali-oss
npm install -D @types/multer

# Mini-program dependencies (needed for build)
cd "$AppDir\apps\miniprogram"
npm install @tarojs/plugin-platform-weapp@4.0.0 @tarojs/taro-loader@4.0.0 babel-preset-taro@4.0.0 @babel/preset-react @tarojs/react@4.0.0 --legacy-peer-deps

Write-Ok "Dependencies installed"

# =============================================================================
# 4. Update Environment Files
# =============================================================================
Write-Step "Step 4/7 — Updating Environment Files"

$apiEnvPath = "$AppDir\apps\api\.env"
$webEnvPath = "$AppDir\apps\web\.env"

# Add new env vars to API .env if missing
$apiEnv = Get-Content $apiEnvPath -Raw
$newApiVars = @(
    "LCSW_ENCRYPTION_KEY=",
    "WECHAT_APPID=",
    "WECHAT_APP_SECRET=",
    "WECHAT_MINI_APPID=",
    "WECHAT_MINI_SECRET="
)
foreach ($var in $newApiVars) {
    $key = $var.Split('=')[0]
    if ($apiEnv -notmatch "^$key=") {
        Add-Content -Path $apiEnvPath -Value $var -Encoding UTF8
        Write-Ok "Added $key to API .env"
    }
}

Write-Ok "Environment files updated"

# =============================================================================
# 5. Database Migration
# =============================================================================
Write-Step "Step 5/7 — Running Database Migration"

cd "$AppDir\apps\api"
npx prisma generate

# Get DB password from .env
$dbUrl = (Select-String -Path $apiEnvPath -Pattern "^DATABASE_URL=").Line
$dbUrl = $dbUrl -replace "^DATABASE_URL=", ""
# Extract password
$pgPassword = ""
if ($dbUrl -match "://[^:]+:([^@]+)@") {
    $pgPassword = $matches[1]
}
# Extract DB name
$dbName = "healthcoin_db"
if ($dbUrl -match "/([^/]+)$") {
    $dbName = $matches[1]
}

$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$env:PGPASSWORD = $pgPassword

# Find latest migration
$migrations = Get-ChildItem "$AppDir\apps\api\prisma\migrations" -Directory | Sort-Object Name
$latestMigration = $migrations | Select-Object -Last 1
if ($latestMigration -and (Test-Path "$($latestMigration.FullName)\migration.sql")) {
    & "$pgBin\psql.exe" -U postgres -d $dbName -f "$($latestMigration.FullName)\migration.sql" 2>$null
    Write-Ok "Applied migration: $($latestMigration.Name)"
}

# Run prisma migrate deploy for safety
npx prisma migrate deploy 2>$null
Write-Ok "Database migrations complete"

# =============================================================================
# 6. Setup Admin Account
# =============================================================================
Write-Step "Step 6/7 — Setting Up Admin Account"

cd $AppDir
$env:ADMIN_PHONE = $AdminPhone
$env:ADMIN_PASSWORD = $AdminPassword
node scripts/setup-admin.js

# =============================================================================
# 7. Build & Restart
# =============================================================================
Write-Step "Step 7/7 — Building & Restarting Services"

cd $AppDir
npm run build:api
npm run build:web
Write-Ok "Build complete"

# Stop IIS
iisreset /stop 2>$null
Stop-Service W3SVC -ErrorAction SilentlyContinue

# Restart API
cd "$AppDir\apps\api"
pm2 delete healthcoin-api 2>$null
pm2 start dist/src/main.js --name healthcoin-api --restart-delay 3000 --max-restarts 5

# Restart Proxy
cd $AppDir
npm2 delete healthcoin-proxy 2>$null
pm2 start proxy-server.js --name healthcoin-proxy
pm2 save

Write-Ok "Services restarted"

# =============================================================================
# Done
# =============================================================================
Write-Step "Update & Admin Setup Complete!"
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  ✅ Platform updated with all new features" -ForegroundColor Cyan
Write-Host "  ✅ Admin account created/updated" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Admin Login:" -ForegroundColor Yellow
Write-Host "  Phone:    $AdminPhone" -ForegroundColor White
Write-Host "  Password: $AdminPassword" -ForegroundColor White
Write-Host ""
Write-Host "New Features Enabled:" -ForegroundColor Yellow
Write-Host "  • Password login (OTP still works)" -ForegroundColor White
Write-Host "  • WeChat login (configure WECHAT_APPID in .env)" -ForegroundColor White
Write-Host "  • Enhanced profile (name, gender, birthday, email, bio)" -ForegroundColor White
Write-Host "  • File upload to OSS (configure OSS keys in .env)" -ForegroundColor White
Write-Host "  • Mini-program production ready" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Set LCSW_ENCRYPTION_KEY in $AppDir\apps\api\.env" -ForegroundColor White
Write-Host "  2. Set WeChat credentials if using WeChat login" -ForegroundColor White
Write-Host "  3. Set OSS credentials if using file upload" -ForegroundColor White
Write-Host "  4. Open http://YOUR_SERVER_IP/login and test password login" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
