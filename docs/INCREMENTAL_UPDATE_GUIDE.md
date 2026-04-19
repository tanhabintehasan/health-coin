# HealthCoin — Incremental Windows Server RDP Update Guide

> **For:** Updating an existing HealthCoin deployment on Windows Server RDP  
> **From:** Previous version (before security hardening)  
> **To:** Latest `main` branch (post-security audit)  
> **Target IP:** `39.98.241.141`

---

## What Changed (Summary)

This update contains **critical security fixes** and new features. You must apply it before going to production.

### Critical Security Fixes
- **Admin withdrawal endpoints** now properly protected with `AdminGuard`
- **Rate limiting** added to all auth endpoints (OTP, login, WeChat, refresh)
- **Hardcoded SMSbao credentials** removed — must configure via System Settings
- **Fuiou/LCSW payment DEMO fallbacks** removed — must configure real credentials
- **JWT secrets** no longer have unsafe fallbacks — must set in `.env`
- **Demo login** completely removed from backend and frontend
- **Mock WeChat openid** fallback removed — requires real WeChat app credentials
- **Admin config updates** now use a whitelist + block sensitive keys
- **Order status force-change** now validates against valid state machine values
- **bcrypt rounds** increased from 10 → 12
- **CORS** no longer defaults to localhost in production
- **Payment webhooks** now have rate limiting
- **File uploads** in health records now go to OSS instead of local blob URLs

### New Features
- Password authentication (set/change/login)
- WeChat mini-program login (`wx.login` + JWT)
- Web OAuth WeChat login
- OSS file upload endpoint
- Expanded user profile (name, gender, birthday, email, bio)
- Contact form with real backend storage
- Mini-program token refresh on app resume

---

## Prerequisites

Before starting, ensure you have:

1. **RDP access** to `39.98.241.141`
2. **Git** installed on the server
3. **Node.js 20+** and **npm** installed
4. **PostgreSQL 17** running and accessible
5. **Existing project** already cloned at `C:\healthcoin` (or your deploy path)
6. **Proxy server (pm2)** already running the previous version

---

## Step 1: Backup (Strongly Recommended)

```powershell
# RDP into your server, open PowerShell as Administrator

# Backup the database
$env:PGPASSWORD = "your_postgres_password"
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -h localhost -U postgres -d healthcoin -F c -f "C:\backups\healthcoin-pre-update-$(Get-Date -Format yyyyMMdd-HHmmss).dump"

# Backup current code
Compress-Archive -Path "C:\healthcoin" -DestinationPath "C:\backups\healthcoin-code-$(Get-Date -Format yyyyMMdd-HHmmss).zip" -Force
```

---

## Step 2: Pull Latest Code

```powershell
cd C:\healthcoin
git stash
git pull origin main
```

---

## Step 3: Install Dependencies

```powershell
# From project root
cd C:\healthcoin
npm install
```

---

## Step 4: Update Environment Variables

### `apps\api\.env` — Add/Update These Keys

```env
# ================================
# JWT (REQUIRED — no fallbacks anymore)
# ================================
JWT_SECRET=your-super-random-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-different-refresh-secret-min-32-chars

# ================================
# CORS (REQUIRED in production)
# ================================
# Comma-separated list of allowed origins
# Example: https://yourdomain.com,https://admin.yourdomain.com
CORS_ORIGINS=http://localhost:5173,http://localhost:3001

# ================================
# Admin Setup (REQUIRED for setup-admin.js)
# ================================
ADMIN_PHONE=13266893239
ADMIN_PASSWORD=coin@Health.12345
ADMIN_NICKNAME=Administrator

# ================================
# Fuiou Payment (REQUIRED for real payments)
# ================================
FUIOU_MERCHANT_NO=your_real_merchant_no
FUIOU_API_KEY=your_real_api_key
FUIOU_GATEWAY_URL=https://pay.fuiou.com
# Only set to true for testing WITHOUT calling real gateway:
# FUIOU_MOCK_PAYMENTS=false

# ================================
# LCSW / 扫呗 Payment (REQUIRED for real payments)
# ================================
LCSW_MERCHANT_NO=your_lcsw_merchant_no
LCSW_APPID=your_lcsw_appid
LCSW_APP_SECRET=your_lcsw_app_secret
LCSW_ACCESS_TOKEN=your_lcsw_access_token
LCSW_BASE_URL=https://openapi.lcsw.cn

# ================================
# WeChat Mini Program (REQUIRED for wx.login)
# ================================
WECHAT_MINI_APPID=your_wx_appid
WECHAT_MINI_SECRET=your_wx_secret

# ================================
# WeChat Web OAuth (REQUIRED for web QR login)
# ================================
WECHAT_APPID=your_web_wx_appid
WECHAT_SECRET=your_web_wx_secret

# ================================
# SMSbao (REQUIRED for OTP SMS)
# ================================
SMSBAO_USERNAME=your_smsbao_username
SMSBAO_PASSWORD=your_smsbao_password_md5
```

> **Important:** Remove any old `DEMO_LOGIN_ENABLED=true` or `VITE_DEMO_LOGIN_ENABLED=true` lines.

### `apps\web\.env` — Update

```env
VITE_API_BASE_URL=https://your-api-domain.com/api/v1
# Remove: VITE_DEMO_LOGIN_ENABLED
```

---

## Step 5: Apply Database Migration

This migration adds `password`, `name`, `gender`, `birthday`, `email`, and `bio` to the `User` table.

```powershell
cd C:\healthcoin\apps\api
npx prisma migrate deploy
```

If `prisma migrate deploy` fails due to the shadow database issue, apply the migration SQL directly:

```powershell
cd C:\healthcoin\apps\api
npx prisma migrate resolve --applied 20260419085653_add_password_and_profile_fields
```

Then regenerate the client:

```powershell
npx prisma generate
```

---

## Step 6: Set Up / Update Admin Account

The setup script now **requires** `ADMIN_PHONE` and `ADMIN_PASSWORD` environment variables.

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

---

## Step 7: Build All Applications

```powershell
# Build API
cd C:\healthcoin\apps\api
npm run build

# Build Web Frontend
cd C:\healthcoin\apps\web
npm run build

# Build Mini-Program ( WeChat )
cd C:\healthcoin\apps\miniprogram
npm run build:weapp
```

All three should complete with no errors.

---

## Step 8: Restart Production Services

### Option A: Using PM2 (Recommended)

```powershell
cd C:\healthcoin
pm2 stop all
pm2 start proxy-server.js --name healthcoin-proxy
pm2 save
```

### Option B: Using the Provided PowerShell Script

```powershell
cd C:\healthcoin
.\scripts\start-all.ps1
```

---

## Step 9: Verify Deployment

Check these endpoints in a browser or with curl:

```powershell
# API health
curl http://localhost:3000/api/v1/settings/public

# Swagger docs (if enabled)
curl http://localhost:3000/api/v1/api/docs

# Web frontend
curl http://localhost:3001
```

---

## Step 10: Configure System Settings (Admin Panel)

Log in to the admin panel at `https://your-domain.com/login` with:
- **Phone:** `13266893239`
- **Password:** `coin@Health.12345`

Then go to **Settings** and configure:

| Setting | Required Value |
|---------|---------------|
| `smsbao_username` | Your SMSbao username |
| `smsbao_password` | (Set via env var only — blocked from UI) |
| `wechat_appid` | Web OAuth app ID |
| `wechat_mini_appid` | Mini-program app ID |
| `fuiou_merchant_no` | Fuiou merchant number |
| `lcsw_merchant_no` | LCSW merchant number |
| `lcsw_appid` | LCSW app ID |
| `platform_name` | Your brand name |
| `platform_hotline` | Customer service phone |

---

## Troubleshooting

### "JWT_SECRET is not configured" error
```powershell
# Add to apps\api\.env
JWT_SECRET=your-very-long-random-string-at-least-32-characters
JWT_REFRESH_SECRET=another-very-long-random-string
```

### "WeChat mini-program login is not configured" error
```powershell
# Add to apps\api\.env
WECHAT_MINI_APPID=wxYOURAPPID
WECHAT_MINI_SECRET=your_secret
```

### Database migration fails
```powershell
# Mark as applied manually if already in DB
npx prisma migrate resolve --applied 20260419085653_add_password_and_profile_fields
```

### Build fails with "cannot find module"
```powershell
cd C:\healthcoin
npm install
```

---

## Post-Update Security Checklist

- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are set to long random strings
- [ ] `CORS_ORIGINS` is set to your actual domain(s), not localhost
- [ ] `ADMIN_PHONE` and `ADMIN_PASSWORD` are configured before running `setup-admin.js`
- [ ] `FUIOU_MOCK_PAYMENTS` is `false` or unset in production
- [ ] `DEMO_LOGIN_ENABLED` and `VITE_DEMO_LOGIN_ENABLED` are removed
- [ ] SMSbao credentials are configured via env vars
- [ ] WeChat app IDs/secrets are configured
- [ ] Database migration is applied
- [ ] All three builds pass
- [ ] Admin account has `SUPER_ADMIN` role
- [ ] Swagger is disabled or protected in production
- [ ] Contact submissions file `data/contact-submissions.json` is outside web root

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
```

---

## Support

If you encounter issues during the update:
1. Check `C:\healthcoin\apps\api\logs` or pm2 logs: `pm2 logs healthcoin-proxy`
2. Verify `.env` values are correct
3. Ensure PostgreSQL is running: `services.msc` → PostgreSQL
4. Re-run builds individually to identify which app fails
