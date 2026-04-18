#Requires -RunAsAdministrator
<#
.SYNOPSIS
    HealthCoin Platform — Windows Server Deployment Script
.DESCRIPTION
    Deploys the full HealthCoin stack (PostgreSQL + NestJS API + React Frontend)
    to a Windows Server. Run this via RDP on the target server.
.PARAMETER ServerIp
    Public IP or domain of the server (default: auto-detected)
.PARAMETER DbPassword
    PostgreSQL superuser password to set
.PARAMETER JwtSecret
    JWT secret (min 32 chars)
.PARAMETER JwtRefreshSecret
    JWT refresh secret
.PARAMETER CronSecret
    Secret for cron endpoint protection
.EXAMPLE
    .\deploy-windows.ps1 -DbPassword "MyStrongP@ss123" -JwtSecret "..." -JwtRefreshSecret "..."
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
$AppDir = "C:\healthcoin"
$DbName = "healthcoin_db"
$DbUser = "healthcoin_user"
$ApiPort = 3000
$FrontPort = 80
$RepoUrl = "https://github.com/tanhabintehasan/health-coin.git"
$Branch = "main"

# Auto-detect server IP if not provided
if (-not $ServerIp) {
    $ServerIp = (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 10)
    Write-Host "Auto-detected public IP: $ServerIp" -ForegroundColor Cyan
}

# Prompt for missing required parameters
function Prompt-Required($label, $minLength = 1) {
    do {
        $val = Read-Host -Prompt $label
    } while ($val.Length -lt $minLength)
    return $val
}

if (-not $DbPassword) { $DbPassword = Prompt-Required "Enter PostgreSQL password (strong)" }
if (-not $JwtSecret) { $JwtSecret = Prompt-Required "Enter JWT_SECRET (min 32 chars)" 32 }
if (-not $JwtRefreshSecret) { $JwtRefreshSecret = Prompt-Required "Enter JWT_REFRESH_SECRET (min 32 chars)" 32 }
if (-not $CronSecret) { $CronSecret = Prompt-Required "Enter CRON_SECRET (random string)" }

# =============================================================================
# Helpers
# =============================================================================
function Write-Step($msg) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host $msg -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
}

function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[ERR] $msg" -ForegroundColor Red }

# =============================================================================
# 1. Install Chocolatey (Package Manager)
# =============================================================================
Write-Step "Step 1/12 — Installing Chocolatey Package Manager"
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Ok "Chocolatey installed"
} else {
    Write-Ok "Chocolatey already installed"
}

# =============================================================================
# 2. Install Dependencies
# =============================================================================
Write-Step "Step 2/12 — Installing PostgreSQL, Node.js, Git, Nginx"

choco install postgresql17 --params "/Password:$DbPassword" --no-progress -y
choco install nodejs-lts --no-progress -y
choco install git --no-progress -y
choco install nginx --no-progress -y

# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Verify installations
$pgVersion = & "C:\Program Files\PostgreSQL\17\bin\psql.exe" --version 2>$null
$nodeVersion = node -v
$gitVersion = git --version

Write-Ok "PostgreSQL: $pgVersion"
Write-Ok "Node.js: $nodeVersion"
Write-Ok "Git: $gitVersion"

# =============================================================================
# 3. Start PostgreSQL Service
# =============================================================================
Write-Step "Step 3/12 — Starting PostgreSQL Service"

$pgService = Get-Service -Name "postgresql-x64-17" -ErrorAction SilentlyContinue
if (-not $pgService) {
    # Try to find PostgreSQL service
    $pgService = Get-Service | Where-Object { $_.Name -like "postgresql*" } | Select-Object -First 1
}

if ($pgService) {
    Start-Service $pgService.Name
    Set-Service $pgService.Name -StartupType Automatic
    Write-Ok "PostgreSQL service started: $($pgService.Name)"
} else {
    Write-Err "PostgreSQL service not found. Please check installation."
    exit 1
}

# Wait for PostgreSQL to be ready
Start-Sleep -Seconds 3

# =============================================================================
# 4. Create Database & User
# =============================================================================
Write-Step "Step 4/12 — Creating Database and User"

$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$env:PGPASSWORD = $DbPassword

# Create user
& "$pgBin\psql.exe" -U postgres -c "CREATE USER $DbUser WITH PASSWORD '$DbPassword';" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Warn "User may already exist, continuing..."
}

# Create database
& "$pgBin\psql.exe" -U postgres -c "CREATE DATABASE $DbName OWNER $DbUser;" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Database may already exist, continuing..."
}

# Grant privileges
& "$pgBin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;"
& "$pgBin\psql.exe" -U postgres -d $DbName -c "CREATE EXTENSION IF NOT EXISTS "uuid-ossp";"

Write-Ok "Database '$DbName' and user '$DbUser' ready"

# =============================================================================
# 5. Clone Repository
# =============================================================================
Write-Step "Step 5/12 — Cloning Repository"

if (Test-Path $AppDir) {
    Write-Warn "Directory $AppDir exists. Removing..."
    Remove-Item -Recurse -Force $AppDir
}

New-Item -ItemType Directory -Path $AppDir -Force | Out-Null
git clone --depth 1 --branch $Branch $RepoUrl $AppDir
Set-Location $AppDir

Write-Ok "Repository cloned to $AppDir"

# =============================================================================
# 6. Install Node Dependencies
# =============================================================================
Write-Step "Step 6/12 — Installing Node Dependencies"

npm install

# Install PM2 globally
npm install -g pm2

Write-Ok "Dependencies installed"

# =============================================================================
# 7. Create Environment File
# =============================================================================
Write-Step "Step 7/12 — Creating Environment Configuration"

$envContent = @"
# Database (local PostgreSQL)
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
CRON_SECRET=$CronSecret
DEMO_LOGIN_ENABLED=true

# Payment (fill these in later if needed)
FUIOU_MERCHANT_NO=
FUIOU_API_KEY=
FUIOU_GATEWAY_URL=https://pay.fuiou.com

# Aliyun OSS (fill these in later if needed)
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=healthcoin-files
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
"@

Set-Content -Path "$AppDir\apps\api\.env" -Value $envContent -Encoding UTF8
Write-Ok "API environment file created"

# Create frontend production environment file
$webEnvContent = @"
VITE_API_BASE_URL=http://$ServerIp`:$ApiPort/api/v1
VITE_DEMO_LOGIN_ENABLED=true
"@
Set-Content -Path "$AppDir\apps\web\.env" -Value $webEnvContent -Encoding UTF8
Write-Ok "Frontend environment file created"

# =============================================================================
# 8. Generate Prisma & Run Migrations
# =============================================================================
Write-Step "Step 8/12 — Running Database Migrations"

Set-Location "$AppDir\apps\api"
npx prisma generate
npx prisma migrate deploy

Write-Ok "Database migrations applied"

# =============================================================================
# 9. Seed Database (Optional)
# =============================================================================
Write-Step "Step 9/12 — Seeding Database"

$seedSqlPath = "$AppDir\supabase\seed.sql"
if (Test-Path $seedSqlPath) {
    Write-Host "Seed file found. Applying seed data..."
    & "$pgBin\psql.exe" -U $DbUser -d $DbName -f $seedSqlPath
    Write-Ok "Seed data applied"
} else {
    Write-Warn "No seed.sql found, skipping seed"
}

# =============================================================================
# 10. Build Application
# =============================================================================
Write-Step "Step 10/12 — Building Application"

Set-Location $AppDir
npm run build:api
npm run build:web

Write-Ok "Build completed"

# =============================================================================
# 11. Configure Nginx
# =============================================================================
Write-Step "Step 11/12 — Configuring Nginx"

$nginxConf = @"
server {
    listen 80;
    server_name $ServerIp;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:$ApiPort/api/;
        proxy_http_version 1.1;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Swagger docs
    location /api/docs {
        proxy_pass http://127.0.0.1:$ApiPort/api/docs;
        proxy_set_header Host `$host;
    }

    # Static frontend
    location / {
        root $AppDir\apps\web\dist;
        index index.html;
        try_files `$uri `$uri/ /index.html;
    }
}
"@

$nginxConfPath = "C:\tools\nginx-1.26.\conf\sites-available\healthcoin.conf"
if (-not (Test-Path "C:\tools\nginx-1.26.\conf\sites-available")) {
    New-Item -ItemType Directory -Path "C:\tools\nginx-1.26.\conf\sites-available" -Force | Out-Null
}

Set-Content -Path $nginxConfPath -Value $nginxConf -Encoding UTF8

# Enable site
$nginxEnabledPath = "C:\tools\nginx-1.26.\conf\sites-enabled"
if (-not (Test-Path $nginxEnabledPath)) {
    New-Item -ItemType Directory -Path $nginxEnabledPath -Force | Out-Null
}
Copy-Item $nginxConfPath "$nginxEnabledPath\healthcoin.conf" -Force

# Update nginx.conf to include sites-enabled
$nginxMainConf = "C:\tools\nginx-1.26.\conf\nginx.conf"
$nginxMainContent = Get-Content $nginxMainConf -Raw
if ($nginxMainContent -notmatch "sites-enabled") {
    $nginxMainContent = $nginxMainContent -replace "http \{", "http {`n    include sites-enabled/*.conf;"
    Set-Content -Path $nginxMainConf -Value $nginxMainContent -Encoding UTF8
}

# Test and reload
$nginxExe = "C:\tools\nginx-1.26.\nginx.exe"
& $nginxExe -t
if ($LASTEXITCODE -eq 0) {
    # Start/restart nginx service
    $nginxService = Get-Service -Name "nginx" -ErrorAction SilentlyContinue
    if ($nginxService) {
        Restart-Service nginx
    } else {
        Start-Process $nginxExe
    }
    Write-Ok "Nginx configured and started"
} else {
    Write-Warn "Nginx config test failed. You may need to fix manually."
}

# =============================================================================
# 12. Start API with PM2
# =============================================================================
Write-Step "Step 12/12 — Starting API with PM2"

Set-Location "$AppDir\apps\api"
pm install -g pm2

# Delete existing PM2 process if any
pm2 delete healthcoin-api 2>$null

# Start API
pm2 start dist/src/main.js --name healthcoin-api --restart-delay 3000 --max-restarts 5

# Save PM2 config
pm2 save

# Setup PM2 startup (Windows)
pm2 startup windows | Out-Null

Write-Ok "API started with PM2"

# =============================================================================
# 13. Windows Firewall
# =============================================================================
Write-Step "Step 13/13 — Configuring Windows Firewall"

# Allow HTTP/HTTPS
New-NetFirewallRule -DisplayName "HealthCoin-HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "HealthCoin-HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow -ErrorAction SilentlyContinue

Write-Ok "Firewall rules added"

# =============================================================================
# Done
# =============================================================================
Write-Step "Deployment Complete!"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  HealthCoin is now deployed on your Windows Server!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Public URL:    http://$ServerIp" -ForegroundColor Cyan
Write-Host "  API Docs:      http://$ServerIp/api/docs" -ForegroundColor Cyan
Write-Host "  Login Page:    http://$ServerIp/login" -ForegroundColor Cyan
Write-Host ""
Write-Host "  App Directory: $AppDir" -ForegroundColor White
Write-Host "  Database:      postgresql://$DbUser@localhost:5432/$DbName" -ForegroundColor White
Write-Host ""
Write-Host "  Useful Commands:" -ForegroundColor Yellow
Write-Host "    pm2 status                - Check API status" -ForegroundColor White
Write-Host "    pm2 logs healthcoin-api   - View API logs" -ForegroundColor White
Write-Host "    pm2 restart healthcoin-api - Restart API" -ForegroundColor White
Write-Host ""
Write-Host "  Next Steps:" -ForegroundColor Yellow
Write-Host "    1. Visit http://$ServerIp/api/docs to verify Swagger loads" -ForegroundColor White
Write-Host "    2. Visit http://$ServerIp/login to test login" -ForegroundColor White
Write-Host "    3. Configure SMSbao credentials in admin settings" -ForegroundColor White
Write-Host "    4. Configure Fuiou/LCSW payment credentials when ready" -ForegroundColor White
Write-Host "    5. Set up SSL certificate for HTTPS (recommended)" -ForegroundColor White
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
