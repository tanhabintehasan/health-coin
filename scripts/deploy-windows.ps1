#Requires -RunAsAdministrator
<#
.SYNOPSIS
    HealthCoin Platform — One-Click Complete Windows Server Deployment
.DESCRIPTION
    Handles EVERYTHING automatically:
      1. Removes old installation (even if locked)
      2. Installs PostgreSQL 17, Node.js, Git, PM2
      3. Creates database and user
      4. Clones repository from GitHub
      5. Installs dependencies
      6. Creates environment files
      7. Applies database migrations
      8. Sets up admin account
      9. Builds API, Web, and Mini-Program
     10. Starts all services with PM2
     11. Configures Windows Firewall
     12. Sets up daily backups

    Run inside RDP as Administrator. Just run the script and answer prompts.
#>
param(
    [string]$ServerIp = "",
    [string]$DbPassword = "",
    [string]$AdminPhone = "13266893239",
    [string]$AdminPassword = "coin@Health.12345"
)

$ErrorActionPreference = "Stop"

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

function Prompt-Required($label) {
    do { $val = Read-Host -Prompt $label } while ([string]::IsNullOrWhiteSpace($val))
    return $val
}

function Prompt-Secure($label) {
    $val = Read-Host -Prompt $label -AsSecureString
    return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($val))
}

function Test-Cmd($cmd) {
    try { & $cmd >$null 2>&1; return $true } catch { return $false }
}

# =============================================================================
# 0. Prompts
# =============================================================================
if (-not $ServerIp) {
    $ServerIp = Read-Host -Prompt "Enter your server's public IP address (or domain name)"
    if ([string]::IsNullOrWhiteSpace($ServerIp)) { $ServerIp = "localhost" }
}
if (-not $DbPassword) {
    $DbPassword = Prompt-Secure "Enter a strong PostgreSQL password"
    $DbPasswordConfirm = Prompt-Secure "Confirm PostgreSQL password"
    if ($DbPassword -ne $DbPasswordConfirm) {
        Write-Err "Passwords do not match."
        exit 1
    }
}

# Generate random secrets
$JwtSecret       = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
$JwtRefreshSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
$CronSecret      = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
$LcswEncryptKey  = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })

Write-Ok "Auto-generated JWT_SECRET, JWT_REFRESH_SECRET, CRON_SECRET, LCSW_ENCRYPTION_KEY"

# =============================================================================
# 1. Remove Old Installation
# =============================================================================
Write-Step "Step 1/13 - Removing Old Installation"

try {
    pm2 stop all 2>$null
    pm2 delete all 2>$null
} catch { Write-Warn "PM2 stop failed (may not be installed yet)" }

try {
    iisreset /stop 2>$null
    Stop-Service W3SVC -ErrorAction SilentlyContinue
} catch { }

# Force delete using cmd /c rmdir which handles locked files better
if (Test-Path $AppDir) {
    Write-Warn "Deleting old $AppDir..."
    cmd /c "rmdir /s /q `"$AppDir`"" 2>$null
    Start-Sleep -Seconds 2
    if (Test-Path $AppDir) {
        # Fallback: rename and delete later
        $oldDir = "C:\healthcoin_old_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Rename-Item -Path $AppDir -NewName $oldDir -Force -ErrorAction SilentlyContinue
        Write-Warn "Could not delete old dir. Renamed to $oldDir. You can delete it manually later."
    } else {
        Write-Ok "Old deployment removed"
    }
}

Unregister-ScheduledTask -TaskName "HealthCoin Daily Backup" -Confirm:$false -ErrorAction SilentlyContinue
Write-Ok "Cleanup complete"

# =============================================================================
# 2. Install Chocolatey
# =============================================================================
Write-Step "Step 2/13 - Installing Chocolatey"
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
Write-Step "Step 3/13 - Installing PostgreSQL 17, Node.js, Git"

choco install postgresql17 --params "/Password:$DbPassword" --no-progress -y
choco install nodejs-lts --no-progress -y
choco install git --no-progress -y

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Verify
$pgVersion = & "C:\Program Files\PostgreSQL\17\bin\psql.exe" --version 2>$null
$nodeVersion = node -v 2>$null
$gitVersion = git --version 2>$null

Write-Ok "PostgreSQL: $pgVersion"
Write-Ok "Node.js: $nodeVersion"
Write-Ok "Git: $gitVersion"

# =============================================================================
# 4. Start PostgreSQL
# =============================================================================
Write-Step "Step 4/13 - Starting PostgreSQL"
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
Write-Step "Step 5/13 - Creating Database and User"
$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$env:PGPASSWORD = $DbPassword

# Drop existing
& "$pgBin\psql.exe" -U postgres -c "DROP DATABASE IF EXISTS $DbName;" 2>$null
& "$pgBin\psql.exe" -U postgres -c "DROP USER IF EXISTS $DbUser;" 2>$null

# Create
& "$pgBin\psql.exe" -U postgres -c "CREATE USER $DbUser WITH PASSWORD '$DbPassword';"
& "$pgBin\psql.exe" -U postgres -c "CREATE DATABASE $DbName OWNER $DbUser;"
& "$pgBin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;"

# Create extension (use single quotes, no escaping issues)
& "$pgBin\psql.exe" -U postgres -d $DbName -c "CREATE EXTENSION IF NOT EXISTS uuid-ossp;"

Write-Ok "Database '$DbName' created with user '$DbUser'"

# =============================================================================
# 6. Clone Repository
# =============================================================================
Write-Step "Step 6/13 - Cloning Repository"

# Ensure directory exists and is empty
New-Item -ItemType Directory -Path $AppDir -Force | Out-Null

# Remove any files that might be in the directory
Remove-Item -Path "$AppDir\*" -Recurse -Force -ErrorAction SilentlyContinue

# Clone
git clone --depth 1 --branch $Branch $RepoUrl "$AppDir\_temp" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Err "Git clone failed. Trying alternative method..."
    # Alternative: download as zip
    $zipPath = "$AppDir\repo.zip"
    Invoke-WebRequest -Uri "https://github.com/tanhabintehasan/health-coin/archive/refs/heads/$Branch.zip" -OutFile $zipPath -UseBasicParsing
    Expand-Archive -Path $zipPath -DestinationPath "$AppDir\_temp" -Force
    Move-Item -Path "$AppDir\_temp\health-coin-$Branch\*" -Destination $AppDir -Force
    Remove-Item -Path "$AppDir\_temp" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
} else {
    # Move files from _temp to AppDir
    Move-Item -Path "$AppDir\_temp\*" -Destination $AppDir -Force
    Move-Item -Path "$AppDir\_temp\.*" -Destination $AppDir -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "$AppDir\_temp" -Recurse -Force -ErrorAction SilentlyContinue
}

# Verify clone succeeded
if (-not (Test-Path "$AppDir\package.json")) {
    Write-Err "Failed to clone repository. $AppDir\package.json not found."
    exit 1
}

Set-Location $AppDir
Write-Ok "Cloned to $AppDir"

# =============================================================================
# 7. Install Dependencies
# =============================================================================
Write-Step "Step 7/13 - Installing Dependencies"

npm install
if ($LASTEXITCODE -ne 0) {
    Write-Err "npm install failed at root level"
    exit 1
}

npm install -g pm2

# Ensure API dependencies
Set-Location "$AppDir\apps\api"
npm install

# Ensure miniprogram dependencies
Set-Location "$AppDir\apps\miniprogram"
npm install

Set-Location $AppDir
Write-Ok "Dependencies installed"

# =============================================================================
# 8. Create Environment Files
# =============================================================================
Write-Step "Step 8/13 - Creating Environment Files"

# Ensure directories exist
New-Item -ItemType Directory -Path "$AppDir\apps\api" -Force | Out-Null
New-Item -ItemType Directory -Path "$AppDir\apps\web" -Force | Out-Null

# API .env
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
# IMPORTANT: After you have a domain, replace * with your actual domain
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
# ADMIN SETUP
# ============================================
ADMIN_PHONE=$AdminPhone
ADMIN_PASSWORD=$AdminPassword
ADMIN_NICKNAME=Administrator

# ============================================
# FUIOU PAYMENT
# ============================================
FUIOU_MERCHANT_NO=
FUIOU_API_KEY=
FUIOU_GATEWAY_URL=https://pay.fuiou.com
FUIOU_MOCK_PAYMENTS=false

# ============================================
# LCSW / 扫呗 PAYMENT
# ============================================
LCSW_MERCHANT_NO=
LCSW_APPID=
LCSW_APP_SECRET=
LCSW_ACCESS_TOKEN=
LCSW_BASE_URL=https://openapi.lcsw.cn
LCSW_ENCRYPTION_KEY=$LcswEncryptKey

# ============================================
# WECHAT MINI PROGRAM
# ============================================
WECHAT_MINI_APPID=wxYOURAPPIDHERE
WECHAT_MINI_SECRET=

# ============================================
# WECHAT WEB OAUTH
# ============================================
WECHAT_APPID=wxYOURWEBAPPID
WECHAT_SECRET=

# ============================================
# SMSBAO
# ============================================
SMSBAO_USERNAME=
SMSBAO_PASSWORD=
SMSBAO_TEMPLATE=【健康币】您的验证码是[code]，5分钟内有效。

# ============================================
# ALIYUN OSS
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
# IMPORTANT: Do NOT include :3000 port here. Web must call proxy on port 80.
$webEnv = @"
VITE_API_BASE_URL=http://$ServerIp/api/v1
"@
Set-Content -Path "$AppDir\apps\web\.env" -Value $webEnv -Encoding UTF8
Write-Ok "Web .env created"

# =============================================================================
# 9. Database Migrations
# =============================================================================
Write-Step "Step 9/13 - Running Database Migrations"
Set-Location "$AppDir\apps\api"
npx prisma generate
if ($LASTEXITCODE -ne 0) { Write-Err "prisma generate failed"; exit 1 }

npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { Write-Err "prisma migrate deploy failed"; exit 1 }

Write-Ok "Migrations applied"

# =============================================================================
# 10. Setup Admin Account
# =============================================================================
Write-Step "Step 10/13 - Setting Up Admin Account"
Set-Location $AppDir
$env:ADMIN_PHONE = $AdminPhone
$env:ADMIN_PASSWORD = $AdminPassword
$env:ADMIN_NICKNAME = "Administrator"
node scripts\setup-admin.js
if ($LASTEXITCODE -ne 0) { Write-Err "Admin setup failed"; exit 1 }
Write-Ok "Admin account ready"

# =============================================================================
# 11. Build All Applications
# =============================================================================
Write-Step "Step 11/13 - Building All Applications"

Set-Location "$AppDir\apps\api"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "API build failed"; exit 1 }
Write-Ok "API build complete"

Set-Location "$AppDir\apps\web"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "Web build failed"; exit 1 }
Write-Ok "Web build complete"

Set-Location "$AppDir\apps\miniprogram"
npm run build:weapp
if ($LASTEXITCODE -ne 0) { Write-Err "Mini-program build failed"; exit 1 }
Write-Ok "Mini-program build complete"

# =============================================================================
# 12. Start Services
# =============================================================================
Write-Step "Step 12/13 - Starting Services"

iisreset /stop 2>$null
Stop-Service W3SVC -ErrorAction SilentlyContinue
Write-Ok "IIS stopped"

New-NetFirewallRule -DisplayName "HealthCoin-HTTP"  -Direction Inbound -Protocol TCP -LocalPort 80    -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "HealthCoin-API"   -Direction Inbound -Protocol TCP -LocalPort $ApiPort -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "HealthCoin-HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443   -Action Allow -ErrorAction SilentlyContinue
Write-Ok "Firewall rules added"

pm2 startup windows 2>$null | Invoke-Expression

Set-Location "$AppDir\apps\api"
pm2 delete healthcoin-api 2>$null
pm2 start dist\src\main.js --name healthcoin-api --restart-delay 3000 --max-restarts 5
Write-Ok "API started on port $ApiPort"

Set-Location $AppDir
pm2 delete healthcoin-proxy 2>$null
pm2 start proxy-server.js --name healthcoin-proxy
pm2 save
Write-Ok "Proxy started on port 80"

# =============================================================================
# 13. Setup Daily Backups
# =============================================================================
Write-Step "Step 13/13 - Setting Up Daily Backups"

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
Write-Ok "Daily backup scheduled"

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
Write-Host "CRITICAL - Do these BEFORE production:" -ForegroundColor Red
Write-Host "  1. Open ports 80, 443 in cloud Security Group" -ForegroundColor White
Write-Host "  2. Fill payment credentials in $AppDir\apps\api\.env" -ForegroundColor White
Write-Host "  3. Replace CORS_ORIGINS=* with your real domain" -ForegroundColor White
Write-Host "  4. Set WeChat AppIDs, SMSbao, OSS credentials" -ForegroundColor White
Write-Host "  5. After editing .env: pm2 restart all" -ForegroundColor White
Write-Host ""
Write-Host "Commands:" -ForegroundColor Yellow
Write-Host "  pm2 status                  - Check services" -ForegroundColor White
Write-Host "  pm2 logs healthcoin-api     - API logs" -ForegroundColor White
Write-Host "  pm2 logs healthcoin-proxy   - Proxy logs" -ForegroundColor White
Write-Host "  pm2 restart all             - Restart all" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
