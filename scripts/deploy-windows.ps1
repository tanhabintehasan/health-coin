#Requires -RunAsAdministrator
<#
.SYNOPSIS
    HealthCoin Platform — Windows Server Deployment Script
.DESCRIPTION
    Deploys API (port 3000) + Unified Web Frontend (via proxy on port 80).
    Run this inside the RDP session on the target server as Administrator.
    
    After deployment, configure your domain's A record to point to this server's IP,
    then update APP_URL in apps/api/.env and VITE_API_BASE_URL in apps/web/.env.
.PARAMETER ServerIp
    Public IP address of this server (used for initial .env setup).
.PARAMETER DbPassword
    PostgreSQL password. Will prompt if not provided.
.PARAMETER JwtSecret
    JWT secret (min 32 chars). Will prompt if not provided.
.PARAMETER JwtRefreshSecret
    JWT refresh secret (min 32 chars). Will prompt if not provided.
.PARAMETER CronSecret
    Secret for cron endpoints. Will prompt if not provided.
#>
param(
    [string]$ServerIp = "",
    [string]$DbPassword = "",
    [string]$JwtSecret = "",
    [string]$JwtRefreshSecret = "",
    [string]$CronSecret = ""
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
    $ServerIp = Read-Host -Prompt "Enter your server's public IP address (or domain if you have one)"
    if (-not $ServerIp) { $ServerIp = "localhost" }
}
if (-not $DbPassword)     { $DbPassword     = Prompt-Required "Enter PostgreSQL password (strong)" }
if (-not $JwtSecret)      { $JwtSecret      = Prompt-Required "Enter JWT_SECRET (min 32 chars)" 32 }
if (-not $JwtRefreshSecret){ $JwtRefreshSecret = Prompt-Required "Enter JWT_REFRESH_SECRET (min 32 chars)" 32 }
if (-not $CronSecret)     { $CronSecret     = Prompt-Required "Enter CRON_SECRET (random string)" }

# =============================================================================
# 1. Install Chocolatey
# =============================================================================
Write-Step "Step 1/10 — Installing Chocolatey"
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
# 2. Install PostgreSQL, Node.js, Git
# =============================================================================
Write-Step "Step 2/10 — Installing PostgreSQL, Node.js, Git"

choco install postgresql17 --params "/Password:$DbPassword" --no-progress -y
choco install nodejs-lts --no-progress -y
choco install git --no-progress -y

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Ok "PostgreSQL: $(& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' --version 2>$null)"
Write-Ok "Node.js: $(node -v)"
Write-Ok "Git: $(git --version)"

# =============================================================================
# 3. Start PostgreSQL
# =============================================================================
Write-Step "Step 3/10 — Starting PostgreSQL"
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
# 4. Create Database & User
# =============================================================================
Write-Step "Step 4/10 — Creating Database and User"
$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$env:PGPASSWORD = $DbPassword

& "$pgBin\psql.exe" -U postgres -c "CREATE USER $DbUser WITH PASSWORD '$DbPassword';" 2>$null
if ($LASTEXITCODE -ne 0) { Write-Warn "User may already exist, continuing..." }

& "$pgBin\psql.exe" -U postgres -c "CREATE DATABASE $DbName OWNER $DbUser;" 2>$null
if ($LASTEXITCODE -ne 0) { Write-Warn "Database may already exist, continuing..." }

& "$pgBin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;"
& "$pgBin\psql.exe" -U postgres -d $DbName -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

Write-Ok "Database ready"

# =============================================================================
# 5. Clone Repository
# =============================================================================
Write-Step "Step 5/10 — Cloning Repository"
if (Test-Path $AppDir) {
    Write-Warn "Directory $AppDir exists. Removing..."
    Remove-Item -Recurse -Force $AppDir -ErrorAction SilentlyContinue
    if (Test-Path $AppDir) {
        $AppDir = "C:\healthcoin_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Write-Warn "Could not delete $AppDir. Using fallback: $AppDir"
    }
}
New-Item -ItemType Directory -Path $AppDir -Force | Out-Null
git clone --depth 1 --branch $Branch $RepoUrl $AppDir
Set-Location $AppDir
Write-Ok "Cloned to $AppDir"

# =============================================================================
# 6. Install Dependencies
# =============================================================================
Write-Step "Step 6/10 — Installing Dependencies"
npm install
npm install -g pm2
npm install express http-proxy-middleware
Write-Ok "Dependencies installed"

# =============================================================================
# 7. Create Environment Files
# =============================================================================
Write-Step "Step 7/10 — Creating Environment Files"

# API .env
$apiEnv = @"
# Database
DATABASE_URL=postgresql://$DbUser`:$DbPassword@localhost:5432/$DbName

# JWT
JWT_SECRET=$JwtSecret
JWT_REFRESH_SECRET=$JwtRefreshSecret
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d

# App
NODE_ENV=production
PORT=$ApiPort
APP_URL=http://$ServerIp
CORS_ORIGINS=*

# Security
CRON_SECRET=$CronSecret

# Demo login (disable in real production)
DEMO_LOGIN_ENABLED=true

# OSS (Alibaba Cloud) — optional, configure later in Admin Settings
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=healthcoin-files
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com

# Fuiou Payment — configure after getting credentials from Fuiou
FUIOU_MERCHANT_NO=
FUIOU_API_KEY=
FUIOU_GATEWAY_URL=https://pay.fuiou.com
"@
Set-Content -Path "$AppDir\apps\api\.env" -Value $apiEnv -Encoding UTF8
Write-Ok "API .env created"

# Web .env
$webEnv = @"
VITE_API_BASE_URL=http://$ServerIp/api/v1
VITE_DEMO_LOGIN_ENABLED=true
"@
Set-Content -Path "$AppDir\apps\web\.env" -Value $webEnv -Encoding UTF8
Write-Ok "Web .env created"

# =============================================================================
# 8. Database Migrations & Seed
# =============================================================================
Write-Step "Step 8/10 — Running Migrations & Seed"
Set-Location "$AppDir\apps\api"
npx prisma generate
npx prisma migrate deploy

$seedSqlPath = "$AppDir\supabase\seed.sql"
if (Test-Path $seedSqlPath) {
    & "$pgBin\psql.exe" -U $DbUser -d $DbName -f $seedSqlPath
    Write-Ok "Seed applied"
} else {
    Write-Warn "No seed.sql found"
}

# =============================================================================
# 9. Build Application
# =============================================================================
Write-Step "Step 9/10 — Building Application"
Set-Location $AppDir
npm run build:api
npm run build:web
Write-Ok "Build completed"

# =============================================================================
# 10. Start Services
# =============================================================================
Write-Step "Step 10/10 — Starting Services"

# Stop IIS to free port 80
iisreset /stop 2>$null
Stop-Service W3SVC -ErrorAction SilentlyContinue
Write-Ok "IIS stopped (port 80 freed)"

# Windows Firewall
New-NetFirewallRule -DisplayName "HealthCoin-HTTP"    -Direction Inbound -Protocol TCP -LocalPort 80    -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "HealthCoin-API"     -Direction Inbound -Protocol TCP -LocalPort $ApiPort -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "HealthCoin-HTTPS"   -Direction Inbound -Protocol TCP -LocalPort 443   -Action Allow -ErrorAction SilentlyContinue
Write-Ok "Firewall rules added"

# Save PM2 startup script
pm2 startup windows 2>$null | Invoke-Expression

# Start API
Set-Location "$AppDir\apps\api"
pm2 delete healthcoin-api 2>$null
pm2 start dist/src/main.js --name healthcoin-api --restart-delay 3000 --max-restarts 5
Write-Ok "API started on port $ApiPort"

# Start Proxy (port 80)
Set-Location $AppDir
npm2 delete healthcoin-proxy 2>$null
pm2 start proxy-server.js --name healthcoin-proxy
pm2 save
Write-Ok "Proxy started on port 80"

# =============================================================================
# Done
# =============================================================================
Write-Step "Deployment Complete!"
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Site:   http://$ServerIp/" -ForegroundColor Cyan
Write-Host "  API:    http://$ServerIp`:$ApiPort/api/docs" -ForegroundColor Cyan
Write-Host "  Dir:    $AppDir" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps (CRITICAL):" -ForegroundColor Yellow
Write-Host "  1. Open port 80 and 443 in your cloud provider's Security Group" -ForegroundColor White
Write-Host "  2. Configure SMS in Admin Portal → Settings (for OTP login)" -ForegroundColor White
Write-Host "  3. Configure Payment providers in Admin Portal → Settings" -ForegroundColor White
Write-Host "  4. Point your domain A-record to $ServerIp" -ForegroundColor White
Write-Host "  5. Update APP_URL in apps\api\.env to your domain" -ForegroundColor White
Write-Host "  6. Update VITE_API_BASE_URL in apps\web\.env to your domain" -ForegroundColor White
Write-Host "  7. Rebuild and restart: npm run build:web; pm2 restart all" -ForegroundColor White
Write-Host ""
Write-Host "Commands:" -ForegroundColor Yellow
Write-Host "  pm2 status                  - Check all services" -ForegroundColor White
Write-Host "  pm2 logs healthcoin-api     - API logs" -ForegroundColor White
Write-Host "  pm2 logs healthcoin-proxy   - Proxy logs" -ForegroundColor White
Write-Host "  pm2 restart all             - Restart all services" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
