#Requires -Version 5.1
<#
.SYNOPSIS
    HealthCoin — Configure Payment Providers, SMS, and WeChat
.DESCRIPTION
    Run this AFTER 01-deploy.ps1 to set LCSW, SMSbao, and WeChat credentials.
#>
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HealthCoin Payment Configuration" -ForegroundColor Cyan
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

# ── Prompts ───────────────────────────────────────────────────────────────────
Write-Host "`n--- LCSW Payment (required) ---" -ForegroundColor Yellow
$lcswMerchantNo = Read-Host -Prompt "LCSW Merchant No"
$lcswTerminalId = Read-Host -Prompt "LCSW Terminal ID"
$lcswAccessToken = Read-Host -Prompt "LCSW Access Token"
$lcswBaseUrl = Read-Host -Prompt "LCSW Base URL (default: https://openapi.lcsw.cn)"
if ([string]::IsNullOrWhiteSpace($lcswBaseUrl)) { $lcswBaseUrl = "https://openapi.lcsw.cn" }

Write-Host "`n--- SMSbao (optional — press Enter to skip) ---" -ForegroundColor Yellow
$smsbaoUser = Read-Host -Prompt "SMSbao Username"
$smsbaoPass = Read-Host -Prompt "SMSbao Password"

Write-Host "`n--- WeChat Mini Program (optional — press Enter to skip) ---" -ForegroundColor Yellow
$wxAppId = Read-Host -Prompt "WeChat Mini AppID"
$wxSecret = Read-Host -Prompt "WeChat Mini Secret"

# ── Build SQL ─────────────────────────────────────────────────────────────────
$sql = @"
-- Payment provider settings
INSERT INTO system_configs ("key", "value", "updatedAt") VALUES
('payment_lcsw_enabled', 'true', NOW()),
('payment_fuiou_enabled', 'false', NOW()),
('payment_wechat_enabled', 'false', NOW()),
('payment_alipay_enabled', 'false', NOW()),
('payment_coin_enabled', 'true', NOW()),
('payment_provider_primary', 'lcsw', NOW()),
('mall_default_coin_offset_rate', '0.5', NOW()),
('order_approval_required', 'false', NOW()),
('product_review_required', 'true', NOW()),
('redemption_code_valid_days', '30', NOW()),
('allow_partial_redemption', 'false', NOW()),
('platform_commission_rate', '0.05', NOW()),
('withdrawal_commission_rate', '0.02', NOW()),
('mutual_coin_own_rate', '0.10', NOW()),
('mutual_coin_l1_rate', '0.05', NOW()),
('mutual_coin_l2_rate', '0.03', NOW()),
('health_coin_multiplier', '1.0', NOW()),
('universal_coin_own_rate', '0.10', NOW()),
('universal_coin_l1_rate', '0.05', NOW())
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();
"@

# Add LCSW credentials
if (-not [string]::IsNullOrWhiteSpace($lcswMerchantNo)) {
    $sql += @"

INSERT INTO system_configs ("key", "value", "updatedAt") VALUES
('lcsw_merchant_no', '$lcswMerchantNo', NOW()),
('lcsw_terminal_id', '$lcswTerminalId', NOW()),
('lcsw_access_token', '$lcswAccessToken', NOW()),
('lcsw_base_url', '$lcswBaseUrl', NOW())
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();
"@
}

# Add SMS credentials
if (-not [string]::IsNullOrWhiteSpace($smsbaoUser)) {
    $sql += @"

INSERT INTO system_configs ("key", "value", "updatedAt") VALUES
('smsbao_username', '$smsbaoUser', NOW()),
('smsbao_password', '$smsbaoPass', NOW()),
('sms_enabled', 'true', NOW()),
('otp_expiry_seconds', '300', NOW()),
('otp_resend_seconds', '60', NOW()),
('otp_hourly_limit', '10', NOW()),
('sms_provider', 'smsbao', NOW())
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();
"@
}

# Add WeChat credentials
if (-not [string]::IsNullOrWhiteSpace($wxAppId)) {
    $sql += @"

INSERT INTO system_configs ("key", "value", "updatedAt") VALUES
('wechat_mini_appid', '$wxAppId', NOW()),
('wechat_mini_secret', '$wxSecret', NOW())
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();
"@
}

# Verification
$sql += @"

SELECT 'config' as type, "key", "value" FROM system_configs
WHERE "key" IN ('payment_lcsw_enabled','payment_fuiou_enabled','payment_coin_enabled','payment_provider_primary','lcsw_merchant_no','sms_enabled','wechat_mini_appid')
ORDER BY "key";
"@

# ── Run SQL ───────────────────────────────────────────────────────────────────
Write-Host "`nApplying configuration..." -ForegroundColor Yellow
$env:PGPASSWORD = Read-Host -Prompt "PostgreSQL password" -AsSecureString
$env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($env:PGPASSWORD))

$sql | & $psql -U postgres -d healthcoin_db -a -f -

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "PAYMENT CONFIGURATION COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Restart API to apply all changes:" -ForegroundColor Yellow
Write-Host "  pm2 restart healthcoin-api" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
