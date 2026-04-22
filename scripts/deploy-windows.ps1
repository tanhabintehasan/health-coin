#Requires -RunAsAdministrator
<#
.SYNOPSIS
    HealthCoin Platform — Complete Windows Server Deployment Script
.DESCRIPTION
    Interactive deployment. Prompts for all secrets manually.
    Run as Administrator inside RDP.
#>
param(
    [string]$ServerIp = "39.98.241.141"
)

$ErrorActionPreference = "Stop"

# ── Config ────────────────────────────────────────────────────────────────────
$AppDir  = "C:\healthcoin"
$DbName  = "healthcoin_db"
$DbUser  = "healthcoin_user"
$ApiPort = 3000
$RepoUrl = "https://github.com/tanhabintehasan/health-coin.git"
$Branch  = "main"

# ── Helpers ───────────────────────────────────────────────────────────────────
function Write-Step($msg) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host $msg -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}
function Write-Ok($msg)  { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg){ Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[ERR] $msg" -ForegroundColor Red; exit 1 }

function Prompt-Required($label) {
    $val = ""
    while ([string]::IsNullOrWhiteSpace($val)) {
        $val = Read-Host -Prompt $label
    }
    return $val
}

function Prompt-Secret($label) {
    $val = Read-Host -Prompt $label -AsSecureString
    return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($val))
}

# ── 0. Prompts ────────────────────────────────────────────────────────────────
Write-Step "HealthCoin Deployment — Please provide the following"

if ([string]::IsNullOrWhiteSpace($ServerIp)) {
    $ServerIp = Read-Host -Prompt "Server IP (default: 39.98.241.141)"
    if ([string]::IsNullOrWhiteSpace($ServerIp)) { $ServerIp = "39.98.241.141" }
}

$DbPassword    = Prompt-Secret "PostgreSQL password"
$DbPasswordConfirm = Prompt-Secret "Confirm PostgreSQL password"
if ($DbPassword -ne $DbPasswordConfirm) { Write-Err "Passwords do not match." }

$AdminPhone    = Prompt-Required "Admin phone (default: 13266893239)"
if ($AdminPhone -eq "default") { $AdminPhone = "13266893239" }
$AdminPassword = Prompt-Secret "Admin password"
$AdminPassConfirm  = Prompt-Secret "Confirm admin password"
if ($AdminPassword -ne $AdminPassConfirm) { Write-Err "Admin passwords do not match." }

Write-Host ""
Write-Host "You must provide 3 secret keys. Use random alphanumeric strings (32-64 chars)." -ForegroundColor Yellow
Write-Host "Example generator: https://www.lastpass.com/features/password-generator" -ForegroundColor Yellow
Write-Host ""

$JwtSecret        = Prompt-Required "JWT_SECRET (min 32 chars, letters + numbers only)"
$JwtRefreshSecret = Prompt-Required "JWT_REFRESH_SECRET (min 32 chars, letters + numbers only)"
$LcswEncryptKey   = Prompt-Required "LCSW_ENCRYPTION_KEY (min 16 chars, letters + numbers only)"

if ($JwtSecret.Length -lt 8 -or $JwtRefreshSecret.Length -lt 8) {
    Write-Warn "Secrets are very short. Recommend at least 32 characters for production."
}

# ── 1. Stop Services ──────────────────────────────────────────────────────────
Write-Step "Step 1/11 — Stopping Services"
try { pm2 stop all 2>$null } catch {}
try { pm2 delete all 2>$null } catch {}
try { iisreset /stop 2>$null } catch {}
try { Stop-Service W3SVC -ErrorAction SilentlyContinue } catch {}
Write-Ok "Services stopped"

# ── 2. Clean Old Directory ────────────────────────────────────────────────────
Write-Step "Step 2/11 — Cleaning Old Directory"
if (Test-Path $AppDir) {
    try {
        Remove-Item -Recurse -Force $AppDir -ErrorAction Stop
        Write-Ok "Old directory removed"
    } catch {
        Write-Warn "Could not delete $AppDir (files locked). Renaming instead..."
        $backupName = "C:\healthcoin_old_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Rename-Item -Path $AppDir -NewName $backupName -Force
        Write-Ok "Renamed old directory to $backupName"
    }
}

# ── 3. Clone Repository ───────────────────────────────────────────────────────
Write-Step "Step 3/11 — Cloning Repository"
$cloneOk = $false
try {
    $tempDir = "$env:TEMP\hc_clone_$(Get-Random)"
    git clone --depth 1 --branch $Branch $RepoUrl $tempDir 2>&1 | Out-Null
    if (Test-Path "$tempDir\package.json") {
        Move-Item -Path $tempDir -Destination $AppDir -Force
        $cloneOk = $true
        Write-Ok "Git clone successful"
    }
} catch {}

if (-not $cloneOk) {
    Write-Warn "Git clone failed, trying ZIP download..."
    $zipPath = "$env:TEMP\hc.zip"
    $zipExtract = "$env:TEMP\hc_extract"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri "https://github.com/tanhabintehasan/health-coin/archive/refs/heads/$Branch.zip" -OutFile $zipPath -UseBasicParsing -TimeoutSec 120
        Expand-Archive -Path $zipPath -DestinationPath $zipExtract -Force
        $inner = Get-ChildItem -Path $zipExtract -Directory | Select-Object -First 1
        Move-Item -Path $inner.FullName -Destination $AppDir -Force
        Write-Ok "ZIP download successful"
    } catch {
        Write-Err "Both git clone and ZIP download failed. Check internet connection."
    } finally {
        Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $zipExtract -Recurse -Force -ErrorAction SilentlyContinue
    }
}

if (-not (Test-Path "$AppDir\package.json")) { Write-Err "Repository not found at $AppDir" }
Set-Location $AppDir
Write-Ok "Repository ready at $AppDir"

# ── 4. Install Dependencies ───────────────────────────────────────────────────
Write-Step "Step 4/11 — Installing Dependencies"
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { Write-Err "npm install failed" }

npm install -g pm2
Write-Ok "Dependencies installed"

# Verify prisma is present
if (-not (Test-Path "$AppDir\node_modules\prisma\package.json")) {
    Write-Warn "Prisma not in root node_modules, installing at API level..."
    Set-Location "$AppDir\apps\api"
    npm install --legacy-peer-deps
    Set-Location $AppDir
}
Write-Ok "Prisma verified"

# ── 5. Database Setup ─────────────────────────────────────────────────────────
Write-Step "Step 5/11 — Database Setup"
$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$env:PGPASSWORD = $DbPassword

& "$pgBin\psql.exe" -U postgres -c "DROP DATABASE IF EXISTS $DbName;" 2>$null
& "$pgBin\psql.exe" -U postgres -c "DROP USER IF EXISTS $DbUser;" 2>$null
& "$pgBin\psql.exe" -U postgres -c "CREATE USER $DbUser WITH PASSWORD '$DbPassword';"
& "$pgBin\psql.exe" -U postgres -c "CREATE DATABASE $DbName OWNER $DbUser;"
& "$pgBin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;"
& "$pgBin\psql.exe" -U postgres -d $DbName -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
Write-Ok "Database created"

# ── 6. Environment Files ──────────────────────────────────────────────────────
Write-Step "Step 6/11 — Creating Environment Files"

New-Item -ItemType Directory -Path "$AppDir\apps\api" -Force | Out-Null
New-Item -ItemType Directory -Path "$AppDir\apps\web" -Force | Out-Null

$apiEnv = @"
NODE_ENV=production
PORT=$ApiPort
DATABASE_URL=postgresql://$DbUser`:$DbPassword@localhost:5432/$DbName
JWT_SECRET=$JwtSecret
JWT_REFRESH_SECRET=$JwtRefreshSecret
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
LCSW_MERCHANT_NO=
LCSW_APPID=
LCSW_APP_SECRET=
LCSW_ACCESS_TOKEN=
LCSW_BASE_URL=https://openapi.lcsw.cn
LCSW_ENCRYPTION_KEY=$LcswEncryptKey
WECHAT_MINI_APPID=wxYOURAPPIDHERE
WECHAT_MINI_SECRET=
WECHAT_APPID=wxYOURWEBAPPID
WECHAT_SECRET=
SMSBAO_USERNAME=CX3308
SMSBAO_PASSWORD=d246e48c94264b2f8a2dbe17877e8a7d
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

# ── 7. Prisma Generate & Migrate ──────────────────────────────────────────────
Write-Step "Step 7/11 — Database Migration"
Set-Location "$AppDir\apps\api"
npm run prisma:generate
if ($LASTEXITCODE -ne 0) { Write-Err "prisma generate failed" }

npm run prisma:migrate:deploy
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Migration failed. Resetting database and retrying..."
    $env:PGPASSWORD = $DbPassword
    & "$pgBin\psql.exe" -U postgres -c "DROP DATABASE IF EXISTS $DbName;"
    & "$pgBin\psql.exe" -U postgres -c "CREATE DATABASE $DbName OWNER $DbUser;"
    & "$pgBin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;"
    & "$pgBin\psql.exe" -U postgres -d $DbName -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
    npm run prisma:migrate:deploy
    if ($LASTEXITCODE -ne 0) { Write-Err "prisma migrate deploy failed after retry" }
}
Write-Ok "Migration applied"

# ── 8. Seed Essential Data ────────────────────────────────────────────────────
Write-Step "Step 8/11 — Seeding Essential Data (Tiers, Regions, Configs)"
Set-Location $AppDir
node scripts\seed-essential.js
if ($LASTEXITCODE -ne 0) { Write-Err "Essential seeding failed" }
Write-Ok "Essential data seeded"

# ── 9. Admin Setup ────────────────────────────────────────────────────────────
Write-Step "Step 9/11 — Setting Up Admin Account"
Set-Location $AppDir
$env:ADMIN_PHONE = $AdminPhone
$env:ADMIN_PASSWORD = $AdminPassword
$env:ADMIN_NICKNAME = "Administrator"
node scripts\setup-admin.js
if ($LASTEXITCODE -ne 0) { Write-Err "Admin setup failed" }
Write-Ok "Admin account created"

# ── 9. Build ──────────────────────────────────────────────────────────────────
Write-Step "Step 10/11 — Building Applications"
Set-Location "$AppDir\apps\api"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "API build failed" }
Write-Ok "API build complete"

Set-Location "$AppDir\apps\web"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "Web build failed" }
Write-Ok "Web build complete"

Set-Location "$AppDir\apps\miniprogram"
npm run build:weapp 2>$null
if ($LASTEXITCODE -ne 0) { Write-Warn "Mini-program build failed (optional)" }
else { Write-Ok "Mini-program build complete" }

# ── 10. Start Services ────────────────────────────────────────────────────────
Write-Step "Step 11/11 — Starting Services"

iisreset /stop 2>$null
Stop-Service W3SVC -ErrorAction SilentlyContinue

New-NetFirewallRule -DisplayName "HealthCoin-HTTP"  -Direction Inbound -Protocol TCP -LocalPort 80    -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "HealthCoin-API"   -Direction Inbound -Protocol TCP -LocalPort $ApiPort -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "HealthCoin-HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443   -Action Allow -ErrorAction SilentlyContinue

pm2 startup windows 2>$null | Invoke-Expression

Set-Location "$AppDir\apps\api"
pm2 delete healthcoin-api 2>$null
pm2 start dist\src\main.js --name healthcoin-api --restart-delay 3000 --max-restarts 5

Set-Location $AppDir
pm2 delete healthcoin-proxy 2>$null
pm2 start proxy-server.js --name healthcoin-proxy
pm2 save

Write-Ok "Services started"

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Step "Deployment Complete!"
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Site:     http://$ServerIp/" -ForegroundColor Cyan
Write-Host "  API Docs: http://$ServerIp/api/docs" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Admin Login:" -ForegroundColor Yellow
Write-Host "  Phone:    $AdminPhone" -ForegroundColor White
Write-Host "  Password: $AdminPassword" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  pm2 status              - Check services" -ForegroundColor White
Write-Host "  pm2 logs healthcoin-api - API logs" -ForegroundColor White
Write-Host "  pm2 restart all         - Restart" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
