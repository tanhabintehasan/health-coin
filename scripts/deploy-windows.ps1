#Requires -RunAsAdministrator
<#
.SYNOPSIS
    HealthCoin Platform — One-Click Windows Server Deployment
.DESCRIPTION
    Handles everything automatically. Run as Administrator inside RDP.
#>
param(
    [string]$ServerIp = "",
    [string]$DbPassword = "",
    [string]$AdminPhone = "13266893239",
    [string]$AdminPassword = "coin@Health.12345"
)

$ErrorActionPreference = "Stop"

$AppDir     = "C:\healthcoin"
$DbName     = "healthcoin_db"
$DbUser     = "healthcoin_user"
$ApiPort    = 3000
$RepoUrl    = "https://github.com/tanhabintehasan/health-coin.git"
$Branch     = "main"

function Write-Step($msg) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host $msg -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
}
function Write-Ok($msg)  { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg){ Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[ERR] $msg" -ForegroundColor Red; exit 1 }

function Prompt-Secure($label) {
    $val = Read-Host -Prompt $label -AsSecureString
    return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($val))
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
    if ($DbPassword -ne $DbPasswordConfirm) { Write-Err "Passwords do not match." }
}

$JwtSecret       = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
$JwtRefreshSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
$CronSecret      = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
$LcswEncryptKey  = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })

Write-Ok "Auto-generated secrets"

# =============================================================================
# 1. Stop Services
# =============================================================================
Write-Step "Step 1/12 - Stopping Services"
try { pm2 stop all 2>$null } catch {}
try { pm2 delete all 2>$null } catch {}
try { iisreset /stop 2>$null } catch {}
try { Stop-Service W3SVC -ErrorAction SilentlyContinue } catch {}
Write-Ok "Services stopped"

# =============================================================================
# 2. Install Chocolatey + Software
# =============================================================================
Write-Step "Step 2/12 - Installing Prerequisites"
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Ok "Chocolatey installed"
} else { Write-Ok "Chocolatey already installed" }

choco install postgresql17 --params "/Password:$DbPassword" --no-progress -y
choco install nodejs-lts --no-progress -y
choco install git --no-progress -y
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
Write-Ok "PostgreSQL, Node.js, Git installed/verified"

# =============================================================================
# 3. Start PostgreSQL
# =============================================================================
Write-Step "Step 3/12 - Starting PostgreSQL"
$pgService = Get-Service -Name "postgresql-x64-17" -ErrorAction SilentlyContinue
if (-not $pgService) { $pgService = Get-Service | Where-Object { $_.Name -like "postgresql*" } | Select-Object -First 1 }
if ($pgService) {
    Start-Service $pgService.Name
    Set-Service $pgService.Name -StartupType Automatic
    Write-Ok "PostgreSQL started"
} else { Write-Err "PostgreSQL service not found" }
Start-Sleep -Seconds 3

# =============================================================================
# 4. Create Database
# =============================================================================
Write-Step "Step 4/12 - Creating Database"
$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$env:PGPASSWORD = $DbPassword
& "$pgBin\psql.exe" -U postgres -c "DROP DATABASE IF EXISTS $DbName;" 2>$null
& "$pgBin\psql.exe" -U postgres -c "DROP USER IF EXISTS $DbUser;" 2>$null
& "$pgBin\psql.exe" -U postgres -c "CREATE USER $DbUser WITH PASSWORD '$DbPassword';"
& "$pgBin\psql.exe" -U postgres -c "CREATE DATABASE $DbName OWNER $DbUser;"
& "$pgBin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;"
& "$pgBin\psql.exe" -U postgres -d $DbName -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
Write-Ok "Database created"

# =============================================================================
# 5. Clone Repository
# =============================================================================
Write-Step "Step 5/12 - Cloning Repository"

# Method 1: Git clone into temp, then move
$cloneSuccess = $false
try {
    $tempDir = "$env:TEMP\healthcoin_clone_$(Get-Random)"
    if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue }
    git clone --depth 1 --branch $Branch $RepoUrl $tempDir 2>&1 | Out-Null
    if (Test-Path "$tempDir\package.json") {
        if (Test-Path $AppDir) { Remove-Item -Recurse -Force $AppDir -ErrorAction SilentlyContinue }
        Move-Item -Path $tempDir -Destination $AppDir -Force
        $cloneSuccess = $true
        Write-Ok "Git clone successful"
    }
} catch { }

if (-not $cloneSuccess) {
    Write-Warn "Git clone failed, trying ZIP download..."
    $zipPath = "$env:TEMP\healthcoin.zip"
    $zipExtract = "$env:TEMP\healthcoin_zip_$(Get-Random)"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri "https://github.com/tanhabintehasan/health-coin/archive/refs/heads/$Branch.zip" -OutFile $zipPath -UseBasicParsing -TimeoutSec 120
        Expand-Archive -Path $zipPath -DestinationPath $zipExtract -Force
        $innerDir = Get-ChildItem -Path $zipExtract -Directory | Select-Object -First 1
        if (Test-Path $AppDir) { Remove-Item -Recurse -Force $AppDir -ErrorAction SilentlyContinue }
        Move-Item -Path $innerDir.FullName -Destination $AppDir -Force
        Write-Ok "ZIP download successful"
    } catch {
        Write-Err "Both git clone and ZIP download failed. Check internet connection."
    } finally {
        if (Test-Path $zipPath) { Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue }
        if (Test-Path $zipExtract) { Remove-Item -Path $zipExtract -Recurse -Force -ErrorAction SilentlyContinue }
    }
}

# Verify
if (-not (Test-Path "$AppDir\package.json")) { Write-Err "Repository clone/download failed. No package.json found." }
Set-Location $AppDir
Write-Ok "Repository ready at $AppDir"

# =============================================================================
# 6. Install Dependencies
# =============================================================================
Write-Step "Step 6/12 - Installing Dependencies"
npm install
if ($LASTEXITCODE -ne 0) { Write-Err "npm install failed" }
npm install -g pm2
Set-Location "$AppDir\apps\api"; npm install
Set-Location "$AppDir\apps\miniprogram"; npm install
Set-Location $AppDir
Write-Ok "Dependencies installed"

# Try to auto-fix vulnerabilities (non-fatal)
Write-Step "Step 6b/12 - Fixing npm vulnerabilities"
npm audit fix --force 2>$null | Out-Null
Write-Ok "npm audit fix attempted (some upstream deps may remain)"

# =============================================================================
# 7. Create Environment Files
# =============================================================================
Write-Step "Step 7/12 - Creating Environment Files"

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
CRON_SECRET=$CronSecret
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

$webEnv = @"
VITE_API_BASE_URL=http://$ServerIp/api/v1
"@
Set-Content -Path "$AppDir\apps\web\.env" -Value $webEnv -Encoding UTF8
Write-Ok "Environment files created"

# =============================================================================
# 8. Database Migration
# =============================================================================
Write-Step "Step 8/12 - Running Database Migration"
Set-Location "$AppDir\apps\api"
npx prisma generate
if ($LASTEXITCODE -ne 0) { Write-Err "prisma generate failed" }
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { Write-Err "prisma migrate deploy failed" }
Write-Ok "Migration applied"

# =============================================================================
# 9. Setup Admin
# =============================================================================
Write-Step "Step 9/12 - Setting Up Admin Account"
Set-Location $AppDir
$env:ADMIN_PHONE = $AdminPhone
$env:ADMIN_PASSWORD = $AdminPassword
$env:ADMIN_NICKNAME = "Administrator"
node scripts\setup-admin.js
if ($LASTEXITCODE -ne 0) { Write-Err "Admin setup failed" }
Write-Ok "Admin account created"

# =============================================================================
# 10. Build Applications
# =============================================================================
Write-Step "Step 10/12 - Building Applications"
Set-Location "$AppDir\apps\api"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "API build failed" }
Write-Ok "API build complete"

Set-Location "$AppDir\apps\web"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "Web build failed" }
Write-Ok "Web build complete"

Set-Location "$AppDir\apps\miniprogram"
npm run build:weapp
if ($LASTEXITCODE -ne 0) { Write-Err "Mini-program build failed" }
Write-Ok "Mini-program build complete"

# =============================================================================
# 11. Start Services
# =============================================================================
Write-Step "Step 11/12 - Starting Services"
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
npm2 delete healthcoin-proxy 2>$null
pm2 start proxy-server.js --name healthcoin-proxy
pm2 save
Write-Ok "Services started"

# =============================================================================
# 12. Backup Schedule
# =============================================================================
Write-Step "Step 12/12 - Setting Up Daily Backups"
New-Item -ItemType Directory -Path "$AppDir\scripts" -Force | Out-Null
$backupScript = @"
`$date = Get-Date -Format 'yyyyMMdd-HHmmss'
`$backupDir = 'C:\backups'
`$pgBin = 'C:\Program Files\PostgreSQL\17\bin'
`$env:PGPASSWORD = '$DbPassword'
New-Item -ItemType Directory -Path `$backupDir -Force
& `"`$pgBin\pg_dump.exe`" -h localhost -U postgres -d $DbName -F c -f `"`$backupDir\healthcoin-`$date.dump`"
Get-ChildItem `$backupDir -Filter 'healthcoin-*.dump' | Sort-Object Name -Descending | Select-Object -Skip 30 | Remove-Item -Force
"@
$backupScript | Out-File -FilePath "$AppDir\scripts\backup-db.ps1" -Encoding UTF8
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File $AppDir\scripts\backup-db.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName "HealthCoin Daily Backup" -Action $action -Trigger $trigger -Force -ErrorAction SilentlyContinue
Write-Ok "Backup scheduled"

# =============================================================================
# Done
# =============================================================================
Write-Step "Deployment Complete!"
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Site:     http://$ServerIp/" -ForegroundColor Cyan
Write-Host "  API Docs: http://$ServerIp/api/docs" -ForegroundColor Cyan
Write-Host "  Dir:      $AppDir" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Admin Login:" -ForegroundColor Yellow
Write-Host "  Phone:    $AdminPhone" -ForegroundColor White
Write-Host "  Password: $AdminPassword" -ForegroundColor White
Write-Host ""
Write-Host "Commands:" -ForegroundColor Yellow
Write-Host "  pm2 status                  - Check services" -ForegroundColor White
Write-Host "  pm2 logs healthcoin-api     - API logs" -ForegroundColor White
Write-Host "  pm2 restart all             - Restart" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
