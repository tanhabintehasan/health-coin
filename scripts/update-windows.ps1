#Requires -RunAsAdministrator
<#
.SYNOPSIS
    HealthCoin Platform — Update Script for Existing Deployment
.DESCRIPTION
    Safely updates an already-deployed HealthCoin instance on Windows Server.
    Run this inside the RDP session. It preserves the database and environment.
#>
param(
    [string]$AppDir = "C:\healthcoin"
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
# 1. Pre-flight Checks
# =============================================================================
Write-Step "Step 1/8 — Pre-flight Checks"

if (-not (Test-Path $AppDir)) {
    Write-Err "App directory $AppDir does not exist. Run deploy-windows.ps1 first."
    exit 1
}

Set-Location $AppDir

# Check git repo
if (-not (Test-Path ".git")) {
    Write-Err "$AppDir is not a git repository. Cannot update."
    exit 1
}

# Backup current .env files
$apiEnvBackup = Get-Content "$AppDir\apps\api\.env" -Raw -ErrorAction SilentlyContinue
$webEnvBackup = Get-Content "$AppDir\apps\web\.env" -Raw -ErrorAction SilentlyContinue

Write-Ok "Pre-flight complete"

# =============================================================================
# 2. Stop Services
# =============================================================================
Write-Step "Step 2/8 — Stopping Services"
pm2 stop all 2>$null
Write-Ok "Services stopped"

# =============================================================================
# 3. Pull Latest Code
# =============================================================================
Write-Step "Step 3/8 — Pulling Latest Code"

# Stash any local changes (shouldn't be any, but just in case)
git stash 2>$null

# Pull latest
git pull origin main
Write-Ok "Code updated"

# =============================================================================
# 4. Install Dependencies
# =============================================================================
Write-Step "Step 4/8 — Installing Dependencies"
npm install

# Install API-specific new deps
cd "$AppDir\apps\api"
npm install ali-oss
npm install -D @types/multer

cd "$AppDir\apps\miniprogram"
npm install @tarojs/plugin-platform-weapp@4.0.0 @tarojs/taro-loader@4.0.0 babel-preset-taro@4.0.0 @babel/preset-react @tarojs/react@4.0.0 --legacy-peer-deps

Write-Ok "Dependencies installed"

# =============================================================================
# 5. Restore Environment Files
# =============================================================================
Write-Step "Step 5/8 — Restoring Environment Files"

# Restore backed up env files if they exist
if ($apiEnvBackup) {
    Set-Content -Path "$AppDir\apps\api\.env" -Value $apiEnvBackup -Encoding UTF8
    Write-Ok "API .env restored"
} else {
    Write-Warn "No API .env backup found — you may need to recreate it"
}

if ($webEnvBackup) {
    Set-Content -Path "$AppDir\apps\web\.env" -Value $webEnvBackup -Encoding UTF8
    Write-Ok "Web .env restored"
} else {
    Write-Warn "No Web .env backup found — you may need to recreate it"
}

# Add new required env vars if missing
$apiEnvPath = "$AppDir\apps\api\.env"
$apiEnvContent = Get-Content $apiEnvPath -Raw

$newVars = @{
    "LCSW_ENCRYPTION_KEY" = "LCSW_ENCRYPTION_KEY=your_64_char_hex_key_here"
    "WECHAT_APPID" = "WECHAT_APPID="
    "WECHAT_APP_SECRET" = "WECHAT_APP_SECRET="
    "WECHAT_MINI_APPID" = "WECHAT_MINI_APPID="
    "WECHAT_MINI_SECRET" = "WECHAT_MINI_SECRET="
}

foreach ($var in $newVars.GetEnumerator()) {
    if ($apiEnvContent -notmatch "^$($var.Key)=") {
        Add-Content -Path $apiEnvPath -Value $var.Value -Encoding UTF8
        Write-Ok "Added missing env var: $($var.Key)"
    }
}

# =============================================================================
# 6. Database Migration
# =============================================================================
Write-Step "Step 6/8 — Running Database Migration"

cd "$AppDir\apps\api"
npx prisma generate

# Apply new migration
$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$env:PGPASSWORD = (Select-String -Path "$AppDir\apps\api\.env" -Pattern "DATABASE_URL" | ForEach-Object {
    $url = $_.Line -replace "DATABASE_URL=", ""
    # Extract password from postgresql://user:pass@host/db
    if ($url -match "://[^:]+:([^@]+)@") { $matches[1] }
})

# Apply migration SQL directly
$migrationFile = Get-ChildItem "$AppDir\apps\api\prisma\migrations" -Directory | Sort-Object Name | Select-Object -Last 1
if ($migrationFile) {
    $sqlPath = Join-Path $migrationFile.FullName "migration.sql"
    if (Test-Path $sqlPath) {
        # Extract DB name from connection string
        $dbUrl = (Select-String -Path "$AppDir\apps\api\.env" -Pattern "DATABASE_URL").Line
        if ($dbUrl -match "/([^/]+)$") {
            $dbName = $matches[1]
        } else {
            $dbName = "healthcoin_db"
        }
        
        & "$pgBin\psql.exe" -U postgres -d $dbName -f $sqlPath
        Write-Ok "Migration applied: $($migrationFile.Name)"
    }
} else {
    Write-Warn "No migration file found"
}

# Also run Prisma migrate deploy for tracked migrations
npx prisma migrate deploy 2>$null
Write-Ok "Database migrations complete"

# =============================================================================
# 7. Build Applications
# =============================================================================
Write-Step "Step 7/8 — Building Applications"

cd $AppDir
npm run build:api
npm run build:web
Write-Ok "Build complete"

# =============================================================================
# 8. Start Services
# =============================================================================
Write-Step "Step 8/8 — Starting Services"

# Stop IIS to free port 80
iisreset /stop 2>$null
Stop-Service W3SVC -ErrorAction SilentlyContinue

cd "$AppDir\apps\api"
pm2 delete healthcoin-api 2>$null
pm2 start dist/src/main.js --name healthcoin-api --restart-delay 3000 --max-restarts 5

cd $AppDir
pm2 delete healthcoin-proxy 2>$null
pm2 start proxy-server.js --name healthcoin-proxy
pm2 save

Write-Ok "Services started"

# =============================================================================
# Done
# =============================================================================
Write-Step "Update Complete!"
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Update applied successfully!" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Set LCSW_ENCRYPTION_KEY in apps\api\.env" -ForegroundColor White
Write-Host "  2. Set WeChat credentials if using WeChat login" -ForegroundColor White
Write-Host "  3. Run the admin setup script if needed" -ForegroundColor White
Write-Host ""
Write-Host "Commands:" -ForegroundColor Yellow
Write-Host "  pm2 status                  - Check all services" -ForegroundColor White
Write-Host "  pm2 logs healthcoin-api     - API logs" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
