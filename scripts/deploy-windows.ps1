#Requires -RunAsAdministrator
<#
.SYNOPSIS
    HealthCoin Platform — Windows Server Deployment Script
.DESCRIPTION
    Deploys API (port 3000) + Web (via proxy on port 80).
    Run this inside the RDP session on the target server.
#>
param(
    [string]$ServerIp = "39.98.241.141",
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

# =============================================================================
# 0. Prompts
# =============================================================================
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

Write-Ok "PostgreSQL: $(& "C:\Program Files\PostgreSQL\17\bin\psql.exe" --version 2>$null)"
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
DATABASE_URL=postgresql://$DbUser`:$DbPassword@localhost:5432/$DbName
JWT_SECRET=$JwtSecret
JWT_REFRESH_SECRET=$JwtRefreshSecret
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
PORT=$ApiPort
APP_URL=http://$ServerIp
CORS_ORIGINS=*
CRON_SECRET=$CronSecret
DEMO_LOGIN_ENABLED=true
FUIOU_MERCHANT_NO=
FUIOU_API_KEY=
FUIOU_GATEWAY_URL=https://pay.fuiou.com
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=healthcoin-files
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
"@
Set-Content -Path "$AppDir\apps\api\.env" -Value $apiEnv -Encoding UTF8
Write-Ok "API .env created"

# Web .env
Set-Content -Path "$AppDir\apps\web\.env" -Value "VITE_API_BASE_URL=http://$ServerIp/api/v1" -Encoding UTF8
Add-Content -Path "$AppDir\apps\web\.env" -Value "VITE_DEMO_LOGIN_ENABLED=true" -Encoding UTF8
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

# Start API
Set-Location "$AppDir\apps\api"
pm2 delete healthcoin-api 2>$null
pm2 start dist/src/main.js --name healthcoin-api --restart-delay 3000 --max-restarts 5
Write-Ok "API started on port $ApiPort"

# Start Proxy (port 80)
Set-Location $AppDir
pm2 delete healthcoin-proxy 2>$null
pm2 start proxy-server.js --name healthcoin-proxy
pm2 save
Write-Ok "Proxy started on port 80"

# =============================================================================
# Done
# =============================================================================
Write-Step "Deployment Complete!"
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  API:    http://$ServerIp`:$ApiPort/api/docs" -ForegroundColor Cyan
Write-Host "  Site:   http://$ServerIp/" -ForegroundColor Cyan
Write-Host "  Dir:    $AppDir" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Commands:" -ForegroundColor Yellow
Write-Host "  pm2 status                  - Check all services" -ForegroundColor White
Write-Host "  pm2 logs healthcoin-api     - API logs" -ForegroundColor White
Write-Host "  pm2 logs healthcoin-proxy   - Proxy logs" -ForegroundColor White
Write-Host ""
Write-Host "WARNING:" -ForegroundColor Red -BackgroundColor Black
Write-Host "If http://$ServerIp/ does not load from your PC, the" -ForegroundColor Red
Write-Host "Alibaba Cloud Security Group is blocking port 80." -ForegroundColor Red
Write-Host "You MUST open port 80 in the Alibaba Cloud console." -ForegroundColor Red
Write-Host "============================================================" -ForegroundColor Green
