#Requires -RunAsAdministrator
<#
.SYNOPSIS
    HealthCoin Platform — One-Click Complete Windows Server Deployment
.DESCRIPTION
    This script handles EVERYTHING automatically:
      1. Removes old installation (if any)
      2. Installs PostgreSQL 17, Node.js 20, Git, PM2
      3. Creates database and user
      4. Clones repository from GitHub
      5. Installs dependencies
      6. Creates environment files with all required variables
      7. Applies database migrations
      8. Sets up admin account with SUPER_ADMIN role
      9. Builds API, Web Frontend, and Mini-Program
     10. Starts all services with PM2
     11. Configures Windows Firewall
     12. Sets up daily automated backups

    Run this inside your RDP session as Administrator.
    Just run the script and answer the prompts. Nothing else needed.

.PARAMETER ServerIp
    Your server's public IP address or domain name.
.PARAMETER DbPassword
    PostgreSQL password. Will prompt if not provided.
.PARAMETER AdminPhone
    Admin phone number. Default: 13266893239
.PARAMETER AdminPassword
    Admin password. Default: coin@Health.12345
#>
param(
    [string]$ServerIp = "",
    [string]$DbPassword = "",
    [string]$AdminPhone = "13266893239",
    [string]$AdminPassword = "coin@Health.12345"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

# =============================================================================
# Configuration
# =============================================================================
$AppDir     = "C:\healthcoin"
$DbName     = "healthcoin_db"
$DbUser     = "healthcoin_user"
$ApiPort    = 3000
$RepoUrl    = "https://github.com/tanhabintehasan/health-coin.git"
$Branch     = "main"

# =============================================================================
# Helpers
# =============================================================================
function Write-Step($msg) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host $msg -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
}
function Write-Ok($msg)  { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg){ Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[ERR] $msg" -ForegroundColor Red }

function Prompt-Required($label, $minLength = 1) {
    do { $val = Read-Host -Prompt $label } while ($val.Length -lt $minLength)
    return $val
}

function Prompt-Secure($label) {
    $val = Read-Host -Prompt $label -AsSecureString
    return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($val))
}

# =============================================================================
# 0. Prompts
# =============================================================================
if (-not $ServerIp) {
    $ServerIp = Read-Host -Prompt "Enter your server's public IP address (or domain name)"
    if (-not $ServerIp) { $ServerIp = "localhost" }
}
if (-not $DbPassword) {
    $DbPassword = Prompt-Secure "Enter a strong PostgreSQL password"
    $DbPasswordConfirm = Prompt-Secure "Confirm PostgreSQL password"
    if ($DbPassword -ne $DbPasswordConfirm) {
        Write-Err "Passwords do not match."
        exit 1
    }
}

# Generate random JWT secrets automatically
$JwtSecret      = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
$JwtRefreshSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
$CronSecret     = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
$LcswEncryptKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })

Write-Ok "Auto-generated JWT_SECRET, JWT_REFRESH_SECRET, CRON_SECRET, LCSW_ENCRYPTION_KEY"

# =============================================================================
# 1. Remove Old Installation
# =============================================================================
Write-Step "Step 1/13 — Removing Old Installation (if any)"

# Stop all services
pm2 stop all 2>$null
pm2 delete all 2>$null
iisreset /stop 2>$null
Stop-Service W3SVC -ErrorAction SilentlyContinue
Write-Ok "All services stopped"

# Remove old directory
if (Test-Path $AppDir) {
    Remove-Item -Recurse -Force $AppDir -ErrorAction SilentlyContinue
    if (Test-Path $AppDir) {
        Write-Warn "Could not fully delete $AppDir. Some files may remain locked."
    } else {
        Write-Ok "Old deployment removed"
    }
}

# Remove scheduled tasks
Unregister-ScheduledTask -TaskName "HealthCoin Daily Backup" -Confirm:$false -ErrorAction SilentlyContinue
Write-Ok "Cleanup complete"

# =============================================================================
# 2. Install Chocolatey
# =============================================================================
Write-Step "Step 2/13 — Installing Chocolatey"
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Ok "Chocolatey installed"
} else {
    Write-Ok "Chocolatey already installed"
}

# =============================================================================
# 3. Install PostgreSQL, Node.js, Git
# =============================================================================
Write-Step "Step 3/13 — Installing PostgreSQL 17, Node.js 20, Git"

choco install postgresql17 --params "/Password:$DbPassword" --no-progress -y
choco install nodejs-lts --no-progress -y
choco install git --no-progress -y

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Ok "PostgreSQL: $(Get-ItemProperty 'HKLM:\SOFTWARE\PostgreSQL\Installations\postgresql-17' -Name 'Version' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Version)"
Write-Ok "Node.js: $(node -v)"
Write-Ok "Git: $(git --version)"

# =============================================================================
# 4. Start PostgreSQL
# =============================================================================
Write-Step "Step 4/13 — Starting PostgreSQL"
$pgService = Get-Service -Name "postgresql-x64-17" -ErrorAction SilentlyContinue
if (-not $pgService) {
    $pgService = Get-Service | Where-Object { $_.Name -like "postgresql*" } | Select-Object -First 1
}
if ($pgService) {
    Start-Service $pgService.Name
    Set-Service $pgService.Name -StartupType Automatic
    Write-Ok "PostgreSQL started: $($pgService.Name)"
} else {
    Write-Err "PostgreSQL service not found."
    exit 1
}
Start-Sleep -Seconds 3

# =============================================================================
# 5. Create Database & User
# =============================================================================
Write-Step "Step 5/13 — Creating Database and User"
$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$env:PGPASSWORD = $DbPassword

& "$pgBin\psql.exe" -U postgres -c "DROP DATABASE IF EXISTS $DbName;" 2>$null
& "$pgBin\psql.exe" -U postgres -c "DROP USER IF EXISTS $DbUser;" 2>$null

& "$pgBin\psql.exe" -U postgres -c "CREATE USER $DbUser WITH PASSWORD '$DbPassword';"
& "$pgBin\psql.exe" -U postgres -c "CREATE DATABASE $DbName OWNER $DbUser;"
& "$pgBin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;"
& "$pgBin\psql.exe" -U postgres -d $DbName -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

Write-Ok "Database '$DbName' created with user '$DbUser'"

# =============================================================================
# 6. Clone Repository
# =============================================================================
Write-Step "Step 6/13 — Cloning Repository"
New-Item -ItemType Directory -Path $AppDir -Force | Out-Null
git clone --depth 1 --branch $Branch $RepoUrl $AppDir
Set-Location $AppDir
Write-Ok "Cloned to $AppDir"

# =============================================================================
# 7. Install Dependencies
# =============================================================================
Write-Step "Step 7/13 — Installing Dependencies"
npm install
npm install -g pm2
Write-Ok "Dependencies installed"

# =============================================================================
# 8. Create Environment Files
# =============================================================================
Write-Step "Step 8/13 — Creating Environment Files"

# API .env — all required vars, no fallbacks, no demo
$apiEnv = @"
# ============================================
# NODE ENVIRONMENT
# ============================================
NODE_ENV=production
PORT=$ApiPort

# ============================================
# DATABASE
# ============================================
DATABASE_URL=postgresql://$DbUser`:$DbPassword@localhost:5432/$DbName

# ============================================
# JWT (Auto-generated strong random strings)
# ============================================
JWT_SECRET=$JwtSecret
JWT_REFRESH_SECRET=$JwtRefreshSecret
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# CORS
# ============================================
# IMPORTANT: After you have a domain, replace * with your actual domain:
# CORS_ORIGINS=https://yourdomain.com
CORS_ORIGINS=*

# ============================================
# APP URL
# ============================================
APP_URL=http://$ServerIp

# ============================================
# CRON / INTERNAL
# ============================================
CRON_SECRET=$CronSecret

# ============================================
# ADMIN SETUP (Required for setup-admin.js)
# ============================================
ADMIN_PHONE=$AdminPhone
ADMIN_PASSWORD=$AdminPassword
ADMIN_NICKNAME=Administrator

# ============================================
# FUIOU PAYMENT (Fill in after getting credentials from Fuiou)
# ============================================
FUIOU_MERCHANT_NO=
FUIOU_API_KEY=
FUIOU_GATEWAY_URL=https://pay.fuiou.com
FUIOU_MOCK_PAYMENTS=false

# ============================================
# LCSW / 扫呗 PAYMENT (Fill in after getting credentials from LCSW)
# ============================================
LCSW_MERCHANT_NO=
LCSW_APPID=
LCSW_APP_SECRET=
LCSW_ACCESS_TOKEN=
LCSW_BASE_URL=https://openapi.lcsw.cn
LCSW_ENCRYPTION_KEY=$LcswEncryptKey

# ============================================
# WECHAT MINI PROGRAM (Fill in from WeChat MP console)
# ============================================
WECHAT_MINI_APPID=wxYOURAPPIDHERE
WECHAT_MINI_SECRET=

# ============================================
# WECHAT WEB OAUTH (Fill in from WeChat Open Platform)
# ============================================
WECHAT_APPID=wxYOURWEBAPPID
WECHAT_SECRET=

# ============================================
# SMSBAO (Fill in from smsbao.com)
# ============================================
SMSBAO_USERNAME=
SMSBAO_PASSWORD=
SMSBAO_TEMPLATE=【健康币】您的验证码是[code]，5分钟内有效。

# ============================================
# ALIYUN OSS (Fill in from Aliyun console)
# ============================================
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com

# ============================================
# PLATFORM
# ============================================
PLATFORM_NAME=HealthCoin
PLATFORM_COMMISSION_RATE=0.05
"@
Set-Content -Path "$AppDir\apps\api\.env" -Value $apiEnv -Encoding UTF8
Write-Ok "API .env created"

# Web .env
# IMPORTANT: Do NOT include :3000 port here. The web must call the proxy on port 80,
# which then forwards /api requests to the API. This avoids CORS issues.
$webEnv = @"
VITE_API_BASE_URL=http://$ServerIp/api/v1
"@
Set-Content -Path "$AppDir\apps\web\.env" -Value $webEnv -Encoding UTF8
Write-Ok "Web .env created"

# =============================================================================
# 9. Database Migrations
# =============================================================================
Write-Step "Step 9/13 — Running Database Migrations"
Set-Location "$AppDir\apps\api"
npx prisma generate
npx prisma migrate deploy
Write-Ok "Migrations applied"

# =============================================================================
# 10. Setup Admin Account
# =============================================================================
Write-Step "Step 10/13 — Setting Up Admin Account"
Set-Location $AppDir
$env:ADMIN_PHONE = $AdminPhone
$env:ADMIN_PASSWORD = $AdminPassword
$env:ADMIN_NICKNAME = "Administrator"
node scripts\setup-admin.js
Write-Ok "Admin account ready"

# =============================================================================
# 11. Build All Applications
# =============================================================================
Write-Step "Step 11/13 — Building All Applications"
Set-Location $AppDir
npm run build:api
Write-Ok "API build complete"

npm run build:web
Write-Ok "Web build complete"

Set-Location "$AppDir\apps\miniprogram"
npm run build:weapp
Write-Ok "Mini-program build complete"

# =============================================================================
# 12. Start Services
# =============================================================================
Write-Step "Step 12/13 — Starting Services"

# Stop IIS to free port 80
iisreset /stop 2>$null
Stop-Service W3SVC -ErrorAction SilentlyContinue
Write-Ok "IIS stopped (port 80 freed)"

# Windows Firewall
New-NetFirewallRule -DisplayName "HealthCoin-HTTP"    -Direction Inbound -Protocol TCP -LocalPort 80    -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "HealthCoin-API"     -Direction Inbound -Protocol TCP -LocalPort $ApiPort -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "HealthCoin-HTTPS"   -Direction Inbound -Protocol TCP -LocalPort 443   -Action Allow -ErrorAction SilentlyContinue
Write-Ok "Firewall rules added"

# PM2 startup
pm2 startup windows 2>$null | Invoke-Expression

# Start API
Set-Location "$AppDir\apps\api"
pm2 delete healthcoin-api 2>$null
pm2 start dist\src\main.js --name healthcoin-api --restart-delay 3000 --max-restarts 5
Write-Ok "API started on port $ApiPort"

# Start Proxy
Set-Location $AppDir
pm2 delete healthcoin-proxy 2>$null
pm2 start proxy-server.js --name healthcoin-proxy
pm2 save
Write-Ok "Proxy started on port 80"

# =============================================================================
# 13. Setup Daily Backups
# =============================================================================
Write-Step "Step 13/13 — Setting Up Daily Backups"

New-Item -ItemType Directory -Path "$AppDir\scripts" -Force | Out-Null
$backupScript = @"
`$date = Get-Date -Format "yyyyMMdd-HHmmss"
`$backupDir = "C:\backups"
`$pgBin = "C:\Program Files\PostgreSQL\17\bin"
`$env:PGPASSWORD = "$DbPassword"

New-Item -ItemType Directory -Path `$backupDir -Force
& "`$pgBin\pg_dump.exe" -h localhost -U postgres -d $DbName -F c -f "`$backupDir\healthcoin-`$date.dump"
Get-ChildItem `$backupDir -Filter "healthcoin-*.dump" | Sort-Object Name -Descending | Select-Object -Skip 30 | Remove-Item -Force
"@
$backupScript | Out-File -FilePath "$AppDir\scripts\backup-db.ps1" -Encoding UTF8

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File $AppDir\scripts\backup-db.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName "HealthCoin Daily Backup" -Action $action -Trigger $trigger -Force -ErrorAction SilentlyContinue
Write-Ok "Daily backup scheduled for 2:00 AM"

# =============================================================================
# Done
# =============================================================================
Write-Step "Deployment Complete!"
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Site:     http://$ServerIp/" -ForegroundColor Cyan
Write-Host "  API Docs: http://$ServerIp/api/docs" -ForegroundColor Cyan
Write-Host "  App Dir:  $AppDir" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Admin Login:" -ForegroundColor Yellow
Write-Host "  Phone:    $AdminPhone" -ForegroundColor White
Write-Host "  Password: $AdminPassword" -ForegroundColor White
Write-Host ""
Write-Host "CRITICAL — Do these BEFORE going to production:" -ForegroundColor Red
Write-Host "  1. Open port 80 and 443 in your cloud provider's Security Group" -ForegroundColor White
Write-Host "  2. Fill in all empty payment credentials in $AppDir\apps\api\.env" -ForegroundColor White
Write-Host "  3. Replace CORS_ORIGINS=* with your actual domain" -ForegroundColor White
Write-Host "  4. Set real WeChat AppIDs and secrets" -ForegroundColor White
Write-Host "  5. Set SMSbao credentials for OTP login" -ForegroundColor White
Write-Host "  6. Set Aliyun OSS credentials for file uploads" -ForegroundColor White
Write-Host "  7. After editing .env, run: pm2 restart all" -ForegroundColor White
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Yellow
Write-Host "  pm2 status                  - Check all services" -ForegroundColor White
Write-Host "  pm2 logs healthcoin-api     - API logs" -ForegroundColor White
Write-Host "  pm2 logs healthcoin-proxy   - Proxy logs" -ForegroundColor White
Write-Host "  pm2 restart all             - Restart all services" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
