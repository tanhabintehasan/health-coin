# HealthCoin — Complete Windows Server Production Deployment Guide

> **Platform:** HealthCoin Multi-Vendor E-Commerce with HealthCoin Rewards  
> **Server:** Windows Server 2019/2022 via RDP  
> **Target IP:** `39.98.241.141`  
> **Last Updated:** April 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Server Setup](#3-server-setup)
4. [Database Setup](#4-database-setup)
5. [Project Deployment](#5-project-deployment)
6. [Environment Configuration](#6-environment-configuration)
7. [Database Migration & Admin Setup](#7-database-migration--admin-setup)
8. [Building Applications](#8-building-applications)
9. [Process Management (PM2)](#9-process-management-pm2)
10. [IIS Reverse Proxy (Optional)](#10-iis-reverse-proxy-optional)
11. [Firewall Configuration](#11-firewall-configuration)
12. [SSL / HTTPS Setup](#12-ssl--https-setup)
13. [Domain Configuration](#13-domain-configuration)
14. [Verification](#14-verification)
15. [Post-Deployment Security Checklist](#15-post-deployment-security-checklist)
16. [Backup Strategy](#16-backup-strategy)
17. [Troubleshooting](#17-troubleshooting)
18. [Rollback Procedure](#18-rollback-procedure)

---

## 1. Architecture Overview

```
User / Mini-Program
       │
       ▼
  [ Domain / IP ]
       │
       ▼
  [ Nginx / IIS / Proxy Server (Port 80/443) ]
       │
       ├──► Web Frontend (Vite + React) → Port 3001
       │
       ├──► API (NestJS + Prisma) → Port 3000
       │         │
       │         ▼
       │    [ PostgreSQL 17 ]
       │
       └──► Proxy Server (Express) → Port 80
```

### Components
| Component | Technology | Port | Description |
|-----------|-----------|------|-------------|
| API | NestJS + Prisma | 3000 | REST API, payments, auth, admin |
| Web | Vite + React | 3001 | Customer web app, admin dashboard |
| Proxy | Express | 80 | Reverse proxy, API routing |
| Database | PostgreSQL 17 | 5432 | All platform data |
| Mini-Program | Taro 4.0 | N/A | WeChat mini-program (built locally) |

---

## 2. Prerequisites

### Software Requirements

| Software | Version | Download |
|----------|---------|----------|
| Windows Server | 2019 or 2022 | - |
| Node.js | 20.x LTS | https://nodejs.org/ |
| Git for Windows | Latest | https://git-scm.com/download/win |
| PostgreSQL | 17 | https://www.postgresql.org/download/windows/ |
| PM2 | Latest | `npm install -g pm2` |

### Account Requirements

Before deployment, ensure you have accounts/credentials for:

1. **Aliyun OSS** (for file uploads)
2. **Fuiou Payment** (for WeChat/Alipay payments)
3. **LCSW / 扫呗** (for mini-program payments)
4. **WeChat Mini Program** (for `wx.login`)
5. **WeChat Open Platform** (for web OAuth QR login)
6. **SMSbao** (for OTP SMS delivery)
7. **Domain name** with DNS access (for SSL)

---

## 3. Server Setup

### 3.1 Install Node.js

```powershell
# Download Node.js 20.x MSI installer and run it
# Verify installation:
node --version  # Should print v20.x.x
npm --version   # Should print 10.x.x
```

### 3.2 Install Git

```powershell
# Download Git for Windows and install with default options
# Verify:
git --version
```

### 3.3 Configure Git (Global)

```powershell
git config --global user.name "Deploy Bot"
git config --global user.email "deploy@yourdomain.com"
```

### 3.4 Install PM2 Globally

```powershell
npm install -g pm2
pm2 --version
```

### 3.5 Create Deployment Directory

```powershell
New-Item -ItemType Directory -Path "C:\healthcoin" -Force
cd C:\healthcoin
```

---

## 4. Database Setup

### 4.1 Install PostgreSQL 17

1. Download PostgreSQL 17 installer from https://www.postgresql.org/download/windows/
2. Run installer with these settings:
   - **Installation Directory:** `C:\Program Files\PostgreSQL\17`
   - **Data Directory:** `C:\Program Files\PostgreSQL\17\data`
   - **Password:** Set a strong password and **remember it**
   - **Port:** 5432 (default)
   - **Locale:** Default
3. Complete installation

### 4.2 Create Database

```powershell
# Add PostgreSQL bin to PATH (or use full path)
$env:Path += ";C:\Program Files\PostgreSQL\17\bin"
$env:PGPASSWORD = "your_postgres_password"

# Create database
psql -U postgres -c "CREATE DATABASE healthcoin_db;"
psql -U postgres -c "CREATE USER healthcoin_user WITH PASSWORD 'your_app_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE healthcoin_db TO healthcoin_user;"
```

### 4.3 Verify Database Connection

```powershell
psql -U healthcoin_user -d healthcoin_db -c "SELECT 1;"
```

---

## 5. Project Deployment

### 5.1 Clone Repository

```powershell
cd C:\healthcoin
git clone https://github.com/tanhabintehasan/health-coin.git .
```

### 5.2 Install Dependencies

```powershell
cd C:\healthcoin
npm install
```

---

## 6. Environment Configuration

### 6.1 Create API Environment File

Create `C:\healthcoin\apps\api\.env`:

```env
# ============================================
# NODE ENVIRONMENT
# ============================================
NODE_ENV=production
PORT=3000

# ============================================
# DATABASE
# ============================================
DATABASE_URL=postgresql://healthcoin_user:your_app_password@localhost:5432/healthcoin_db

# ============================================
# JWT (CRITICAL: Generate strong random strings, minimum 32 characters)
# Use: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# ============================================
JWT_SECRET=your-super-random-jwt-secret-min-32-chars-change-me
JWT_REFRESH_SECRET=your-different-refresh-secret-min-32-chars-change-me
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# CORS (Your actual domains — NO localhost in production)
# ============================================
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com

# ============================================
# ADMIN SETUP (Required for setup-admin.js)
# ============================================
ADMIN_PHONE=13266893239
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_NICKNAME=Administrator

# ============================================
# FUIOU PAYMENT (Get from Fuiou merchant portal)
# ============================================
FUIOU_MERCHANT_NO=your_fuiou_merchant_no
FUIOU_API_KEY=your_fuiou_api_key
FUIOU_GATEWAY_URL=https://pay.fuiou.com
# ONLY set to true for sandbox testing without real gateway:
FUIOU_MOCK_PAYMENTS=false

# ============================================
# LCSW / 扫呗 PAYMENT (Get from LCSW merchant portal)
# ============================================
LCSW_MERCHANT_NO=your_lcsw_merchant_no
LCSW_APPID=your_lcsw_appid
LCSW_APP_SECRET=your_lcsw_app_secret
LCSW_ACCESS_TOKEN=your_lcsw_access_token
LCSW_BASE_URL=https://openapi.lcsw.cn
LCSW_ENCRYPTION_KEY=your_lcsw_encryption_key

# ============================================
# WECHAT MINI PROGRAM (From WeChat MP admin console)
# ============================================
WECHAT_MINI_APPID=wxYOURMINIAPPID
WECHAT_MINI_SECRET=your_mini_program_secret

# ============================================
# WECHAT WEB OAUTH (From WeChat Open Platform)
# ============================================
WECHAT_APPID=wxYOURWEBAPPID
WECHAT_SECRET=your_web_oauth_secret

# ============================================
# SMSBAO (From smsbao.com)
# ============================================
SMSBAO_USERNAME=your_smsbao_username
SMSBAO_PASSWORD=your_smsbao_password_md5

# ============================================
# ALIYUN OSS (For file uploads)
# ============================================
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your_aliyun_access_key
OSS_ACCESS_KEY_SECRET=your_aliyun_access_secret
OSS_BUCKET=your-bucket-name
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com

# ============================================
# PLATFORM
# ============================================
PLATFORM_NAME=HealthCoin
PLATFORM_COMMISSION_RATE=0.05
```

> **⚠️ CRITICAL:** Never commit `.env` files to Git. The `.gitignore` already excludes them.

### 6.2 Create Web Frontend Environment File

Create `C:\healthcoin\apps\web\.env`:

```env
VITE_API_BASE_URL=https://your-api-domain.com/api/v1
```

### 6.3 Create Mini-Program Config

Edit `C:\healthcoin\apps\miniprogram\project.config.json`:

```json
{
  "description": "HealthCoin Mini Program",
  "packOptions": { "ignore": [] },
  "setting": {
    "urlCheck": false,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "minified": true,
    "coverView": true,
    "showShadowRootInWebhookView": true,
    "checkInvalidKey": true,
    "checkSiteMap": true,
    "uploadWithSourceMap": true,
    "useMultiFrameRuntime": true,
    "useApiHook": true,
    "useApiHostProcess": true,
    "babelSetting": {
      "ignore": [],
      "disablePlugins": [],
      "outputPath": ""
    },
    "enableEngineNative": false,
    "useIsolateContext": true,
    "minifyWXSS": true,
    "minifyWXML": true
  },
  "compileType": "miniprogram",
  "libVersion": "3.0.0",
  "appid": "wxYOURAPPIDHERE",
  "projectname": "healthcoin",
  "condition": {}
}
```

Replace `wxYOURAPPIDHERE` with your actual WeChat mini-program AppID.

---

## 7. Database Migration & Admin Setup

### 7.1 Generate Prisma Client

```powershell
cd C:\healthcoin\apps\api
npx prisma generate
```

### 7.2 Apply Migrations

```powershell
cd C:\healthcoin\apps\api
npx prisma migrate deploy
```

### 7.3 Seed Database (Optional)

```powershell
cd C:\healthcoin\apps\api
npx prisma db seed
```

### 7.4 Set Up Admin Account

The admin setup script requires `ADMIN_PHONE` and `ADMIN_PASSWORD` from `.env`.

```powershell
cd C:\healthcoin
$env:ADMIN_PHONE = "13266893239"
$env:ADMIN_PASSWORD = "your-secure-admin-password"
$env:ADMIN_NICKNAME = "Administrator"
node scripts\setup-admin.js
```

**Expected output:**
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

## 8. Building Applications

### 8.1 Build API

```powershell
cd C:\healthcoin\apps\api
npm run build
```

Expected: NestJS compiles to `dist/` with no errors.

### 8.2 Build Web Frontend

```powershell
cd C:\healthcoin\apps\web
npm run build
```

Expected: Vite builds to `dist/` with no errors.

### 8.3 Build Mini-Program

```powershell
cd C:\healthcoin\apps\miniprogram
npm run build:weapp
```

Expected: Taro compiles to `dist/` with no errors.

> **Note:** The mini-program build output is uploaded to WeChat Developer Tools, not served from the server.

---

## 9. Process Management (PM2)

### 9.1 Start API

```powershell
cd C:\healthcoin\apps\api
pm2 start dist\src\main.js --name healthcoin-api --restart-delay 3000 --max-restarts 5
```

### 9.2 Start Proxy Server

```powershell
cd C:\healthcoin
pm2 start proxy-server.js --name healthcoin-proxy
```

### 9.3 Save PM2 Configuration

```powershell
pm2 save
pm2 startup
```

Follow the output instructions to make PM2 auto-start on Windows boot.

### 9.4 PM2 Useful Commands

```powershell
pm2 status              # View running processes
pm2 logs healthcoin-api # View API logs
pm2 restart all         # Restart all processes
pm2 stop all            # Stop all processes
pm2 delete all          # Remove all processes from PM2
```

---

## 10. IIS Reverse Proxy (Optional)

If you prefer IIS over the Node.js proxy server:

### 10.1 Install IIS and URL Rewrite Module

1. Open **Server Manager** → **Manage** → **Add Roles and Features**
2. Select **Web Server (IIS)** role
3. Install **URL Rewrite Module** from: https://www.iis.net/downloads/microsoft/url-rewrite

### 10.2 Configure Application Request Routing (ARR)

1. Install ARR from: https://www.iis.net/downloads/microsoft/application-request-routing
2. Open IIS Manager → Server → **Application Request Routing Cache**
3. Click **Server Proxy Settings** → Check **Enable proxy**

### 10.3 Create Website

1. Open IIS Manager → Sites → **Add Website**
   - **Site name:** HealthCoin
   - **Physical path:** `C:\healthcoin\apps\web\dist`
   - **Port:** 80
   - **Host name:** yourdomain.com

2. Add URL Rewrite rules for API:
   - Select site → **URL Rewrite** → **Add Rule(s)**
   - **Reverse Proxy**
   - **Inbound rules:** `api/*` → `http://localhost:3000/api/{R:1}`

### 10.4 Start Website

```powershell
iisreset /start
```

---

## 11. Firewall Configuration

### 11.1 Allow Required Ports

```powershell
# HTTP
New-NetFirewallRule -DisplayName "HealthCoin HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# HTTPS
New-NetFirewallRule -DisplayName "HealthCoin HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# API (if exposed directly)
New-NetFirewallRule -DisplayName "HealthCoin API" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

### 11.2 Block Direct Database Access

```powershell
# Ensure PostgreSQL is NOT exposed externally (bind to localhost only)
# Edit: C:\Program Files\PostgreSQL\17\data\postgresql.conf
# Set: listen_addresses = 'localhost'
```

---

## 12. SSL / HTTPS Setup

### 12.1 Using Let's Encrypt (Certbot)

```powershell
# Download Certbot for Windows
# https://dl.eff.org/certbot-beta-installer-win_amd64.exe

# Install certificate
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

### 12.2 Configure Proxy Server for HTTPS

Edit `C:\healthcoin\proxy-server.js` to add HTTPS:

```javascript
const fs = require('fs');
const https = require('https');

const sslOptions = {
  key: fs.readFileSync('C:/Certbot/live/yourdomain.com/privkey.pem'),
  cert: fs.readFileSync('C:/Certbot/live/yourdomain.com/fullchain.pem'),
};

https.createServer(sslOptions, app).listen(443, () => {
  console.log('Proxy server running on HTTPS port 443');
});
```

### 12.3 Auto-Renewal

Set up a Windows Task Scheduler job to run:

```powershell
certbot renew
```

Every 60 days.

---

## 13. Domain Configuration

### 13.1 DNS Records

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | 39.98.241.141 | 600 |
| A | www | 39.98.241.141 | 600 |
| A | api | 39.98.241.141 | 600 |

### 13.2 WeChat Mini-Program Domain Whitelist

In WeChat MP Admin Console:
1. Go to **开发 → 开发管理 → 开发设置**
2. Add to **request合法域名**:
   - `https://yourdomain.com`
   - `https://api.yourdomain.com`

### 13.3 WeChat Web OAuth Callback

In WeChat Open Platform:
1. Set **授权回调域** to: `yourdomain.com`

---

## 14. Verification

### 14.1 API Health Check

```powershell
curl http://localhost:3000/api/v1/settings/public
```

Expected: JSON response with platform settings.

### 14.2 Web Frontend

Open browser to `http://localhost:3001` or `https://yourdomain.com`.

### 14.3 Admin Login Test

1. Navigate to `https://yourdomain.com/login`
2. Switch to **密码登录** (Password Login) tab
3. Enter:
   - Phone: `13266893239`
   - Password: your admin password
4. Should log in and redirect to Admin Dashboard

### 14.4 Payment Webhook Test

```powershell
curl -X POST http://localhost:3000/api/v1/payments/webhooks/fuiou/payment \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "test=value"
```

Expected: `FAIL` (signature invalid) — confirms webhook is listening.

---

## 15. Post-Deployment Security Checklist

Before declaring production-ready, verify ALL of these:

### Authentication & Authorization
- [ ] `JWT_SECRET` is a random string ≥32 characters
- [ ] `JWT_REFRESH_SECRET` is different from `JWT_SECRET`
- [ ] Admin withdrawal endpoints require `AdminGuard`
- [ ] All public auth endpoints have `@Throttle` rate limiting
- [ ] `DEMO_LOGIN_ENABLED` and `VITE_DEMO_LOGIN_ENABLED` are removed from ALL `.env` files
- [ ] No hardcoded credentials in any source file

### Payments
- [ ] `FUIOU_MOCK_PAYMENTS=false` in production
- [ ] Fuiou webhook uses real `FUIOU_API_KEY` (not `DEMO_KEY`)
- [ ] LCSW webhook uses merchant-specific access token (no global fallback)
- [ ] Payment webhook endpoints have rate limiting

### CORS & Networking
- [ ] `CORS_ORIGINS` contains ONLY your production domains
- [ ] No `localhost` in `CORS_ORIGINS` on production server
- [ ] PostgreSQL binds to `localhost` only
- [ ] Firewall blocks port 5432 externally

### Data Protection
- [ ] `.env` files are NOT in Git repository
- [ ] Database backups are automated
- [ ] Contact submissions file (`data/contact-submissions.json`) is outside web root
- [ ] File uploads go to OSS, not local disk

### Admin & Config
- [ ] Admin account has `SUPER_ADMIN` role
- [ ] `forceOrderStatus` validates against `OrderStatus` enum
- [ ] `updateConfigs` blocks sensitive keys (`jwt_secret`, `fuiou_api_key`, etc.)
- [ ] Swagger docs are disabled or protected in production

### Mini-Program
- [ ] `project.config.json` has correct `appid`
- [ ] Domain whitelist configured in WeChat MP console
- [ ] Build output uploaded via WeChat Developer Tools

---

## 16. Backup Strategy

### 16.1 Automated Database Backup

Create `C:\healthcoin\scripts\backup-db.ps1`:

```powershell
$date = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "C:\backups"
$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$env:PGPASSWORD = "your_postgres_password"

New-Item -ItemType Directory -Path $backupDir -Force
& "$pgBin\pg_dump.exe" -h localhost -U postgres -d healthcoin_db -F c -f "$backupDir\healthcoin-$date.dump"

# Keep only last 30 backups
Get-ChildItem $backupDir -Filter "healthcoin-*.dump" | Sort-Object Name -Descending | Select-Object -Skip 30 | Remove-Item -Force
```

### 16.2 Schedule Daily Backup

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File C:\healthcoin\scripts\backup-db.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName "HealthCoin Daily Backup" -Action $action -Trigger $trigger
```

### 16.3 Backup Verification

Test restoring from backup monthly:

```powershell
$env:PGPASSWORD = "your_postgres_password"
& "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" -h localhost -U postgres -d healthcoin_test -c "C:\backups\healthcoin-YYYYMMDD-HHmmss.dump"
```

---

## 17. Troubleshooting

### "JWT_SECRET is not configured"
```powershell
# Add to apps\api\.env
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
```

### "Connection refused" to PostgreSQL
```powershell
# Check PostgreSQL service
Get-Service postgresql*
# Start if stopped
Start-Service postgresql-x64-17
```

### "Port 80 already in use"
```powershell
# Find process using port 80
netstat -ano | findstr :80
# Stop IIS if running
iisreset /stop
Stop-Service W3SVC
```

### PM2 processes won't start
```powershell
# Clear PM2 logs and dump
pm2 flush
pm2 cleardump
# Re-save config
pm2 save
```

### Build fails with Prisma errors
```powershell
cd C:\healthcoin\apps\api
npx prisma generate
npx prisma migrate deploy
npm run build
```

### CORS errors in browser
1. Check `CORS_ORIGINS` in `apps\api\.env` includes your exact domain
2. Restart API: `pm2 restart healthcoin-api`
3. Clear browser cache

---

## 18. Rollback Procedure

### 18.1 Quick Rollback (Code Only)

```powershell
cd C:\healthcoin
git log --oneline -10
# Find the commit hash before deployment
git reset --hard <previous-commit-hash>
npm install
npm run build:api
npm run build:web
pm2 restart all
```

### 18.2 Full Rollback (Code + Database)

```powershell
# Stop services
pm2 stop all

# Restore code from backup
Expand-Archive -Path "C:\backups\healthcoin-code-YYYYMMdd-HHmmss.zip" -DestinationPath "C:\" -Force

# Restore database
$env:PGPASSWORD = "your_postgres_password"
& "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" -h localhost -U postgres -d healthcoin_db -c --clean "C:\backups\healthcoin-YYYYMMdd-HHmmss.dump"

# Restart
pm2 restart all
```

---

## Support & Maintenance

### Regular Maintenance Tasks

| Frequency | Task |
|-----------|------|
| Daily | Check PM2 logs for errors |
| Daily | Verify database backup completed |
| Weekly | Review contact submissions |
| Weekly | Check disk space |
| Monthly | Update SSL certificate |
| Monthly | Review and rotate logs |
| Quarterly | Update Node.js dependencies |
| Quarterly | Security audit of dependencies |

### Log Locations

| Component | Log Path |
|-----------|----------|
| API | `C:\Users\<user>\.pm2\logs\healthcoin-api-*.log` |
| Proxy | `C:\Users\<user>\.pm2\logs\healthcoin-proxy-*.log` |
| PostgreSQL | `C:\Program Files\PostgreSQL\17\data\log\` |

### Emergency Contacts

Keep these handy:
- Server provider (RDP access issues)
- Domain registrar (DNS issues)
- Fuiou / LCSW support (payment issues)
- WeChat MP support (mini-program issues)
- SMSbao support (SMS delivery issues)

---

**End of Document**

*Last verified: April 2026*
