#Requires -Version 5.1
<#
.SYNOPSIS
    HealthCoin — Optional: Configure WeChat Mini Program
.DESCRIPTION
    LCSW payment and SMSbao are ALREADY configured by 01-deploy.ps1.
    Run this ONLY if you want to add WeChat Mini Program login.
#>
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HealthCoin WeChat Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$psql = "$pgBin\psql.exe"
if (-not (Test-Path $psql)) {
    $psql = (where.exe psql 2>$null)
    if (-not $psql) {
        Write-Host "ERROR: psql not found." -ForegroundColor Red
        exit 1
    }
}

Write-Host "`nLCSW payment and SMSbao are already configured." -ForegroundColor Green
Write-Host "This script only adds WeChat Mini Program credentials (optional)." -ForegroundColor Yellow

$wxAppId = Read-Host -Prompt "WeChat Mini AppID (press Enter to skip)"
if ([string]::IsNullOrWhiteSpace($wxAppId)) {
    Write-Host "Skipped. No changes made." -ForegroundColor Yellow
    exit 0
}
$wxSecret = Read-Host -Prompt "WeChat Mini Secret"

$sql = @"
INSERT INTO system_configs ("key", "value", "updatedAt") VALUES
('wechat_mini_appid', '$wxAppId', NOW()),
('wechat_mini_secret', '$wxSecret', NOW())
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();
"@

Write-Host "`nApplying WeChat configuration..." -ForegroundColor Yellow
$env:PGPASSWORD = Read-Host -Prompt "PostgreSQL password" -AsSecureString
$env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($env:PGPASSWORD))

$sql | & $psql -U postgres -d healthcoin_db -a -f -

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "WECHAT CONFIGURATION COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Restart API to apply:" -ForegroundColor Yellow
Write-Host "  pm2 restart healthcoin-api" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
