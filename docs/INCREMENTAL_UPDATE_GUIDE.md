# HealthCoin — Complete Incremental Windows Server RDP Update Guide

> **For:** Updating an existing HealthCoin deployment on Windows Server RDP  
> **From:** First deployed version (before password auth, WeChat login, profile expansion, OSS, mini-program completion, and security hardening)  
> **To:** Latest `main` branch (all features + post-security audit)  
> **Target IP:** `39.98.241.141`

---

## Overview

This guide covers updating your **already-deployed** HealthCoin instance from the original version to the **latest** version. The update includes **two major phases** combined into one:

### Phase 1 — Previous Update (Features)
- **Password authentication** (set, change, and login with phone + password)
- **WeChat mini-program login** (`wx.login` code exchange for JWT tokens)
- **Web OAuth WeChat login** (QR code scan for web users)
- **OSS file upload endpoint** (Aliyun OSS for health records and documents)
- **Expanded user profile** (name, gender, birthday, email, bio fields)
- **Mini-program completion** (assets, auth, health records upload, payment webview, profile info page, token refresh)
- **Admin setup script** (`scripts/setup-admin.js`)
- **Database migration** (`20260419085653_add_password_and_profile_fields`)

### Phase 2 — Current Update (Security Hardening)
- **AdminGuard** added to withdrawal admin endpoints
- **Rate limiting** (`@Throttle`) on all public auth endpoints
- **Hardcoded credentials removed** — SMSbao, Fuiou DEMO_KEY, JWT fallbacks
- **Demo login completely removed** from backend and all frontend code
- **Mock WeChat openid fallback removed** — requires real WeChat credentials
- **Admin config whitelist** — blocks injection of sensitive payment keys
- **Order status validation** — `forceOrderStatus` validates against state machine
- **bcrypt rounds** increased from 10 → 12
- **CORS** no longer defaults to localhost in production
- **Payment webhooks** now have rate limiting
- **LCSW webhook** no longer falls back to global access token
- **Pagination limits** (`@Max(100)` / `clampLimit`) on all list endpoints
- **Contact form** now has a real backend endpoint with validation and rate limiting
- **Health records** now upload to OSS instead of sending local blob URLs

---

## Prerequisites

Before starting, ensure you have:

1. **RDP access** to `39.98.241.141`
2. **Git** installed on the server
3. **Node.js 20+** and **npm** installed
4. **PostgreSQL 17** running and accessible
5. **Existing project** already cloned at `C:\healthcoin` (or your deploy path)
6. **Proxy server (pm2)** already running the previous version
7. **PowerShell** running as **Administrator**

---

## Method 1: One-Click Automated Update (Recommended)

We provide an **automated PowerShell script** (`scripts/update-and-setup-admin.ps1`) that performs the **entire** update for you — both Phase 1 (features) and Phase 2 (security) combined.

### Step 1: Backup (Strongly Recommended)

```powershell
# RDP into your server, open PowerShell as Administrator

# Create backup directory if not exists
New-Item -ItemType Directory -Path "C:\backups" -Force

# Backup the database
$env:PGPASSWORD = "your_postgres_password"
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -h localhost -U postgres -d healthcoin -F c -f "C:\backups\healthcoin-pre-update-$(Get-Date -Format yyyyMMdd-HHmmss).dump"

# Backup current code
Compress-Archive -Path "C:\healthcoin" -DestinationPath "C:\backups\healthcoin-code-$(Get-Date -Format yyyyMMdd-HHmmss).zip" -Force
```

### Step 2: Run the Automated Script

```powershell
cd C:\healthcoin
.\scripts\update-and-setup-admin.ps1 -AppDir "C:\healthcoin" -AdminPhone "13266893239" -AdminPassword "coin@Health.12345"
```

The script will perform all 8 steps automatically:
1. Validate existing deployment
2. Stop PM2 services
3. Pull latest `main` branch
4. Install all dependencies
5. Update `.env` files (add new required vars, remove old demo vars)
6. Apply database migrations
7. Set up / update admin account with `SUPER_ADMIN` role
8. Build API, Web, and Mini-program
9. Restart all services via PM2

### Step 3: Fill in Environment Variables

**After the script finishes, you MUST edit these files and fill in all empty values:**

```powershell
notepad C:\healthcoin\apps\api\.env
```

Required values to fill in before production:

```env
# JWT (generate long random strings, minimum 32 characters each)
JWT_SECRET=your-super-random-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-different-refresh-secret-min-32-chars

# CORS (your actual domains — NO localhost in production)
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com

# Admin (already set by script, verify they are correct)
ADMIN_PHONE=13266893239
ADMIN_PASSWORD=coin@Health.12345

# Fuiou Payment (real credentials from Fuiou)
FUIOU_MERCHANT_NO=your_real_merchant_no
FUIOU_API_KEY=your_real_api_key
FUIOU_GATEWAY_URL=https://pay.fuiou.com
FUIOU_MOCK_PAYMENTS=false

# LCSW / 扫呗 Payment (real credentials from LCSW)
LCSW_MERCHANT_NO=your_lcsw_merchant_no
LCSW_APPID=your_lcsw_appid
LCSW_APP_SECRET=your_lcsw_app_secret
LCSW_ACCESS_TOKEN=your_lcsw_access_token
LCSW_BASE_URL=https://openapi.lcsw.cn
LCSW_ENCRYPTION_KEY=your-encryption-key

# WeChat Mini Program (from WeChat MP admin console)
WECHAT_MINI_APPID=wxYOURAPPID
WECHAT_MINI_SECRET=your_mini_program_secret

# WeChat Web OAuth (from WeChat Open Platform)
WECHAT_APPID=wxYOURWEBAPPID
WECHAT_SECRET=your_web_oauth_secret

# SMSbao (from smsbao.com)
SMSBAO_USERNAME=your_smsbao_username
SMSBAO_PASSWORD=your_smsbao_password_md5

# Aliyun OSS (for file uploads)
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your_access_key
OSS_ACCESS_KEY_SECRET=your_access_secret
OSS_BUCKET=your-bucket-name
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
```

Also verify the web env:

```powershell
notepad C:\healthcoin\apps\web\.env
```

```env
VITE_API_BASE_URL=https://your-api-domain.com/api/v1
```

### Step 4: Restart Services After Editing .env

```powershell
cd C:\healthcoin
pm2 restart all
pm2 save
```

---

## Method 2: Manual Step-by-Step Update

If you prefer to run each step manually instead of using the automated script, follow these steps:

### Step 1: Backup

```powershell
New-Item -ItemType Directory -Path "C:\backups" -Force
$env:PGPASSWORD = "your_postgres_password"
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -h localhost -U postgres -d healthcoin -F c -f "C:\backups\healthcoin-pre-update-$(Get-Date -Format yyyyMMdd-HHmmss).dump"
Compress-Archive -Path "C:\healthcoin" -DestinationPath "C:\backups\healthcoin-code-$(Get-Date -Format yyyyMMdd-HHmmss).zip" -Force
```

### Step 2: Stop Services

```powershell
cd C:\healthcoin
pm2 stop all
```

### Step 3: Pull Latest Code

```powershell
cd C:\healthcoin
git stash 2>$null
git pull origin main
```

### Step 4: Install Dependencies

```powershell
cd C:\healthcoin
npm install

cd C:\healthcoin\apps\api
npm install

cd C:\healthcoin\apps\miniprogram
npm install
```

### Step 5: Update Environment Files

Add all the new environment variables listed in **Method 1 Step 3** above to:
- `C:\healthcoin\apps\api\.env`
- `C:\healthcoin\apps\web\.env`

**Also remove any old lines like:**
```env
DEMO_LOGIN_ENABLED=true
VITE_DEMO_LOGIN_ENABLED=true
```

### Step 6: Apply Database Migration

This migration adds `password`, `name`, `gender`, `birthday`, `email`, and `bio` columns to the `User` table.

```powershell
cd C:\healthcoin\apps\api
npx prisma generate
npx prisma migrate deploy
```

If `migrate deploy` fails:
```powershell
npx prisma migrate resolve --applied 20260419085653_add_password_and_profile_fields
npx prisma generate
```

### Step 7: Set Up / Update Admin Account

The setup script **requires** `ADMIN_PHONE` and `ADMIN_PASSWORD` environment variables (no hardcoded fallbacks).

```powershell
cd C:\healthcoin
$env:ADMIN_PHONE = "13266893239"
$env:ADMIN_PASSWORD = "coin@Health.12345"
$env:ADMIN_NICKNAME = "Administrator"
node scripts\setup-admin.js
```

Expected output:
```
🔧 HealthCoin Admin Setup
==========================
Phone:    13266893239
Nickname: Administrator

👤 Creating new admin user...
✅ User created with 3 wallets.
✅ Admin role (SUPER_ADMIN) assigned.

🎉 Admin setup complete!
```

### Step 8: Build All Applications

```powershell
# API
cd C:\healthcoin\apps\api
npm run build

# Web
cd C:\healthcoin\apps\web
npm run build

# Mini-program
cd C:\healthcoin\apps\miniprogram
npm run build:weapp
```

All three must complete with **no errors**.

### Step 9: Restart Services

```powershell
# Stop IIS if running
iisreset /stop 2>$null
Stop-Service W3SVC -ErrorAction SilentlyContinue

# Restart via PM2
cd C:\healthcoin
pm2 delete healthcoin-api 2>$null
pm2 start "C:\healthcoin\apps\api\dist\src\main.js" --name healthcoin-api --restart-delay 3000 --max-restarts 5

pm2 delete healthcoin-proxy 2>$null
pm2 start "C:\healthcoin\proxy-server.js" --name healthcoin-proxy

pm2 save
```

---

## Verification

After the update, verify these endpoints:

```powershell
# API health
curl http://localhost:3000/api/v1/settings/public

# Web frontend
curl http://localhost:3001
```

### Admin Login Test
- Open `https://your-domain.com/login`
- Switch to **密码登录** (Password Login) tab
- Phone: `13266893239`
- Password: `coin@Health.12345`
- Should log in successfully and redirect to Admin Dashboard

### System Settings Configuration

After logging in as admin, go to **Settings** and configure:

| Setting | Purpose |
|---------|---------|
| `smsbao_username` | SMS service username |
| `wechat_appid` | Web OAuth app ID |
| `wechat_mini_appid` | Mini-program app ID |
| `fuiou_merchant_no` | Fuiou payment merchant |
| `lcsw_merchant_no` | LCSW payment merchant |
| `lcsw_appid` | LCSW app ID |
| `platform_name` | Your brand name |
| `platform_hotline` | Customer service phone |

> **Note:** Sensitive keys like `smsbao_password`, `jwt_secret`, `fuiou_api_key`, `lcsw_access_token` are **blocked** from being set via the admin UI and must be configured in `apps\api\.env` only.

---

## Troubleshooting

### "JWT_SECRET is not configured"
```powershell
# Add to apps\api\.env
JWT_SECRET=your-very-long-random-string-at-least-32-characters
JWT_REFRESH_SECRET=another-very-long-random-string
```

### "WeChat mini-program login is not configured"
```powershell
# Add to apps\api\.env
WECHAT_MINI_APPID=wxYOURAPPID
WECHAT_MINI_SECRET=your_secret
```

### "Admin user not found" when running setup-admin.js
```powershell
# Ensure ADMIN_PHONE and ADMIN_PASSWORD are set as environment variables
$env:ADMIN_PHONE = "13266893239"
$env:ADMIN_PASSWORD = "coin@Health.12345"
node scripts\setup-admin.js
```

### Database migration fails
```powershell
cd C:\healthcoin\apps\api
npx prisma migrate resolve --applied 20260419085653_add_password_and_profile_fields
npx prisma generate
```

### Build fails with "cannot find module"
```powershell
cd C:\healthcoin
npm install
```

### Mini-program build fails
```powershell
cd C:\healthcoin\apps\miniprogram
npm install
npm run build:weapp
```

---

## Post-Update Security Checklist

Before going to production, verify:

- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are set to long random strings (≥32 chars)
- [ ] `CORS_ORIGINS` is set to your actual domain(s), NOT localhost
- [ ] `ADMIN_PHONE` and `ADMIN_PASSWORD` are configured
- [ ] `FUIOU_MOCK_PAYMENTS` is `false` or unset in production
- [ ] `DEMO_LOGIN_ENABLED` and `VITE_DEMO_LOGIN_ENABLED` are removed from all `.env` files
- [ ] SMSbao credentials are configured via `.env` (not hardcoded)
- [ ] WeChat app IDs and secrets are configured
- [ ] Database migration is applied
- [ ] All three builds pass (API, Web, Mini-program)
- [ ] Admin account has `SUPER_ADMIN` role
- [ ] Contact submissions file `data/contact-submissions.json` is outside web root
- [ ] Swagger docs are disabled or protected in production

---

## Rollback Plan

If something goes wrong:

```powershell
# Stop services
pm2 stop all

# Restore code from backup
Expand-Archive -Path "C:\backups\healthcoin-code-YYYYMMdd-HHmmss.zip" -DestinationPath "C:\" -Force

# Restore database
$env:PGPASSWORD = "your_postgres_password"
& "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" -h localhost -U postgres -d healthcoin -c "C:\backups\healthcoin-pre-update-YYYYMMdd-HHmmss.dump"

# Restart old version
cd C:\healthcoin
pm2 start proxy-server.js --name healthcoin-proxy
pm2 save
```

---

## Support

If you encounter issues during the update:
1. Check PM2 logs: `pm2 logs healthcoin-api`
2. Verify `.env` values are correct
3. Ensure PostgreSQL is running: `services.msc` → PostgreSQL
4. Re-run builds individually to identify which app fails
5. Run the setup-admin script again if the admin account is missing
