#Requires -Version 5.1
<#
.SYNOPSIS
    HealthCoin Quick Update Script
.DESCRIPTION
    Builds API + Web and restarts PM2 services.
    Run this on the RDP server after pulling latest code.
#>
$ErrorActionPreference = "Stop"

$AppDir = "C:\healthcoin"
if (-not (Test-Path $AppDir)) {
    Write-Host "[ERR] App directory not found at $AppDir" -ForegroundColor Red
    exit 1
}

Set-Location $AppDir

function Write-Step($msg) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host $msg -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}
function Write-Ok($msg)  { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg){ Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[ERR] $msg" -ForegroundColor Red; exit 1 }

# 1. Git status
Write-Step "Step 1/6 — Checking code"
try {
    $gitStatus = git status --short 2>$null
    if ($gitStatus) {
        Write-Warn "You have uncommitted changes. Make sure they are saved before deploying."
        Write-Host $gitStatus
    } else {
        Write-Ok "Working tree clean"
    }
} catch {
    Write-Warn "Git check skipped"
}

# 2. Install root deps
Write-Step "Step 2/6 — Installing dependencies"
npm install
if ($LASTEXITCODE -ne 0) { Write-Err "npm install failed" }
Write-Ok "Dependencies installed"

# 3. Stop running services to unlock Prisma engine DLL
Write-Step "Step 3/6 — Stopping PM2 services"
pm2 stop all 2>$null
Write-Ok "PM2 services stopped"

# 4. Build API
Write-Step "Step 4/6 — Building API"
Set-Location "$AppDir\apps\api"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "API build failed" }
Write-Ok "API build complete"

# 5. Build Web
Write-Step "Step 5/6 — Building Web"
Set-Location "$AppDir\apps\web"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "Web build failed" }
Write-Ok "Web build complete"

# 6. Restart services
Write-Step "Step 6/6 — Restarting services"
pm2 start all 2>$null
if ($LASTEXITCODE -ne 0) { Write-Warn "PM2 start may have failed (check manually with pm2 list)" }
else { Write-Ok "Services restarted" }

pm2 save

# 6. Save PM2 config
Write-Step "Step 6/6 — Saving PM2 config"
pm2 save
Write-Ok "PM2 config saved"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Please hard-refresh your browser (Ctrl+F5) to clear cache."
Write-Host ""
