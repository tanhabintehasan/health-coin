# Windows Server Deployment Guide — HealthCoin Platform

> Deploy HealthCoin to a Windows Server (RDP) with local PostgreSQL database.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Connect to Your Server](#step-1-connect-to-your-server)
4. [Step 2: Automated Deployment](#step-2-automated-deployment)
5. [Step 3: Configure Your Domain](#step-3-configure-your-domain)
6. [Step 4: Configure SMS (OTP Login)](#step-4-configure-sms-otp-login)
7. [Step 5: Configure Payments](#step-5-configure-payments)
8. [Step 6: SSL / HTTPS](#step-6-ssl--https)
9. [Step 7: Backups](#step-7-backups)
10. [Manual Deployment (Fallback)](#manual-deployment-fallback)
11. [Troubleshooting](#troubleshooting)
12. [Security Recommendations](#security-recommendations)

---

## Architecture Overview

```
Internet ──► [Cloud Firewall :80, :443]
                │
                ▼
           [Windows Firewall]
                │
                ▼
           [Express Proxy :80]
                │
        ┌───────┴───────┐
        ▼               ▼
   /api/* ──►    /* ──►
   [NestJS API]   [React SPA]
   :3000          (static files)
        │
        ▼
   [PostgreSQL :5432]
```

| Component | Technology | Port | Note |
|-----------|------------|------|------|
| API | NestJS + Prisma | 3000 | Internal only (proxied) |
| Web App | Vite + React + Ant Design | 80 (via proxy) | Unified portal (Public/User/Merchant/Admin) |
| Proxy | Express + http-proxy-middleware | 80 | Serves static files + API proxy |
| Database | PostgreSQL 17 | 5432 | Local on same server |

---

## Prerequisites

- **Windows Server 2019/2022** or Windows 10/11
- **Administrator access** inside RDP
- **Internet connection** on the server
- **Server public IP address** (e.g., `39.98.241.141`)
- **RDP credentials** (username + password from your cloud provider)
- **Domain name** (optional but recommended for production)

---

## Step 1: Connect to Your Server

### From Windows:
1. Press `Win + R`, type `mstsc`, press Enter
2. Enter your server's **public IP address**
3. Click **Connect**
4. Enter your **username** and **password**

### From Mac:
1. Download **Microsoft Remote Desktop** from App Store
2. Add PC with your **public IP address**
3. Enter your credentials

---

## Step 2: Automated Deployment

Inside the RDP session, open **PowerShell as Administrator** and run:

```powershell
# Download the deployment script
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/tanhabintehasan/health-coin/main/scripts/deploy-windows.ps1" -OutFile "C:\deploy-windows.ps1"

# Run it
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
C:\deploy-windows.ps1
```

The script will prompt you for:
- **Server IP** — your public IP (or domain if you already have one)
- **PostgreSQL password** — create a strong password
- **JWT_SECRET** — 32+ random characters (generate at https://randomkeygen.com/)
- **JWT_REFRESH_SECRET** — different from JWT_SECRET, also 32+ chars
- **CRON_SECRET** — any random string

The script will automatically:
1. Install Chocolatey
2. Install PostgreSQL 17, Node.js LTS, Git
3. Create database and user
4. Clone the repository
5. Install dependencies
6. Create `.env` files
7. Run database migrations
8. Apply seed data (demo users, system configs)
9. Build API and Web app
10. Configure Windows Firewall
11. Start services with PM2

After completion, verify:
- `http://YOUR_SERVER_IP/` → Should show the HealthCoin homepage
- `http://YOUR_SERVER_IP/api/docs` → Should show Swagger API docs
- `http://YOUR_SERVER_IP/login` → Should show login page

### ⚠️ Cloud Firewall (Critical!)

If your server is from **Alibaba Cloud / AWS / Azure / GCP**, you **must** also open ports in the **cloud provider's Security Group**:

| Port Range | Source | Purpose |
|------------|--------|---------|
| `80` | `0.0.0.0/0` | HTTP traffic |
| `443` | `0.0.0.0/0` | HTTPS traffic (future) |
| `3389` | `YOUR_IP/32` | RDP — **restrict this to your IP only!** |

**Without this**, Windows Firewall rules alone will NOT work — the cloud firewall drops packets first.

---

## Step 3: Configure Your Domain

Once deployment is working via IP, point your domain:

### 3.1 Update DNS Records

At your domain registrar / DNS provider:
- Create an **A record** pointing your domain (e.g., `yourdomain.com`) to your server IP
- Optional: Create a **CNAME** for `www` → `yourdomain.com`

### 3.2 Update Environment Files

On your server, edit the `.env` files:

```powershell
# Update API .env
notepad C:\healthcoin\apps\api\.env
```

Change:
```env
APP_URL=https://yourdomain.com
```

```powershell
# Update Web .env
notepad C:\healthcoin\apps\web\.env
```

Change:
```env
VITE_API_BASE_URL=https://yourdomain.com/api/v1
```

### 3.3 Rebuild and Restart

```powershell
cd C:\healthcoin
npm run build:web
pm2 restart all
```

---

## Step 4: Configure SMS (OTP Login)

The platform uses **SMSbao** for OTP (One-Time Password) login.

### 4.1 Sign up for SMSbao

1. Go to [https://www.smsbao.com](https://www.smsbao.com)
2. Register an account
3. Recharge your account with SMS credits
4. Note your **username** and **password**

### 4.2 Configure in Admin Portal

1. Login to the admin portal: `http://YOUR_SERVER_IP/login`
   - Use demo account: `13800000001` → click "Demo Login"
2. Navigate to **Admin Portal → Settings**
3. Find the **SMS** section and fill in:

| Setting | Value | Example |
|---------|-------|---------|
| `sms_provider` | `smsbao` | smsbao |
| `smsbao_username` | Your SMSbao username | CX3308 |
| `smsbao_password` | Your SMSbao password | your_plain_password |
| `smsbao_template` | Template with `[code]` placeholder | `【健康币】您的验证码是[code]，5分钟内有效。` |
| `sms_enabled` | `true` | true |
| `otp_expiry_seconds` | `300` | 300 (5 minutes) |
| `otp_resend_seconds` | `60` | 60 (1 minute) |
| `otp_hourly_limit` | `5` | 5 per hour per phone |

### 4.3 Test OTP

1. Log out
2. Go to `/login`
3. Enter your real phone number
4. Click "Get OTP"
5. Check your phone for the SMS

### 4.4 SMS Troubleshooting

| Problem | Solution |
|---------|----------|
| "SMSbao username is missing" | Check Admin Settings → `smsbao_username` is filled |
| "短信发送失败" | Check SMSbao account balance at smsbao.com |
| "密码错误" or "账号不存在" | Verify username/password in settings |
| "短信数量不足" | Recharge your SMSbao account |
| OTP not received | Check if your phone number format is correct (11 digits, China mobile) |

---

## Step 5: Configure Payments

The platform supports three payment methods:
- **Fuiou (富友)** — Bank card payments
- **LCSW (扫呗 / 利楚商务)** — WeChat Pay, Alipay, mini-program payments
- **Health Coin** — Internal wallet payment (works immediately, no config needed)

### 5.1 Fuiou Payment Setup

#### Get Credentials from Fuiou:
1. Contact Fuiou Payment ([https://www.fuiou.com](https://www.fuiou.com)) to apply for a merchant account
2. They will provide:
   - **Merchant Number** (`mer_no`)
   - **API Key** (signature key)
   - **Gateway URL** (production or sandbox)

#### Configure in Environment File:

Edit `C:\healthcoin\apps\api\.env`:

```env
FUIOU_MERCHANT_NO=YOUR_MERCHANT_NUMBER
FUIOU_API_KEY=YOUR_API_KEY
FUIOU_GATEWAY_URL=https://pay.fuiou.com
```

Then restart the API:
```powershell
pm2 restart healthcoin-api
```

#### Enable in Admin Portal:
1. Login as Admin → Settings
2. Set `payment_fuiou_enabled` = `true`
3. Set `payment_provider_primary` = `fuiou` (if Fuiou is your primary provider)

#### Fuiou Webhook:
Fuiou will send payment notifications to:
```
https://yourdomain.com/api/v1/webhooks/fuiou/payment
```
Make sure this URL is accessible from the internet and returns `SUCCESS` for successful payments.

### 5.2 LCSW (扫呗) Payment Setup

#### Get Credentials from LCSW:
1. Contact LCSW / 扫呗 ([https://www.lcsw.cn](https://www.lcsw.cn)) to apply for a merchant account
2. They will provide:
   - **Merchant Number** (`merchant_no`)
   - **Terminal ID** (`terminal_id`)
   - **Access Token** (`access_token`)
   - **Base URL** (test or production)

#### Option A: Global LCSW Configuration (simple)

Configure in **Admin Portal → Settings**:

| Setting | Value | Example |
|---------|-------|---------|
| `payment_lcsw_enabled` | `true` | true |
| `lcsw_merchant_no` | Your LCSW merchant number | 8220000123 |
| `lcsw_terminal_id` | Your terminal ID | 10000001 |
| `lcsw_access_token` | Your access token | abc123def456 |
| `lcsw_base_url` | LCSW API base URL | `https://pay.lcsw.cn/lcsw` |

#### Option B: Sub-Merchant Configuration (advanced)

For platforms where each merchant has their own LCSW account:

1. Go to **Admin Portal → Merchants**
2. Each merchant can have their own LCSW account linked
3. The system will automatically use the merchant's LCSW credentials for their orders

#### LCSW Webhook:
LCSW sends notifications to:
```
https://yourdomain.com/api/v1/webhooks/lcsw/payment
```

#### LCSW Mini-Program Payments:
For WeChat mini-program payments, the platform supports LCSW's mini-program payment flow. Requires:
- Mini-program `appId`
- User's `openid`
- Sub-merchant configuration (if applicable)

### 5.3 Coin Payment Setup

Coin payment uses the internal wallet system and works **immediately** with no external configuration:

1. In **Admin Portal → Settings**, set `payment_coin_enabled` = `true`
2. Users can pay with:
   - **Health Coin** (健康币)
   - **Mutual Health Coin** (互助健康币)
   - **Universal Health Coin** (通用健康币)

### 5.4 Payment Troubleshooting

| Problem | Solution |
|---------|----------|
| "No payment provider is currently available" | Check Admin Settings → enable at least one payment provider |
| "Fuiou payment initiation failed" | Verify `FUIOU_MERCHANT_NO` and `FUIOU_API_KEY` in `.env` |
| "LCSW payment configuration is incomplete" | Check `lcsw_merchant_no`, `lcsw_terminal_id`, `lcsw_access_token` in Admin Settings |
| Webhook not received | Ensure your server URL is public and firewall allows port 80/443 |
| Payment marked as paid but order not updated | Check `pm2 logs healthcoin-api` for webhook processing errors |

---

## Step 6: SSL / HTTPS

For production, you **must** use HTTPS.

### Option A: Cloudflare (Easiest & Recommended)

1. Buy a domain (Namecheap, GoDaddy, Alibaba Cloud, etc.)
2. Point domain A-record to your server IP
3. Add domain to [Cloudflare](https://dash.cloudflare.com) (free plan)
4. Change DNS nameservers to Cloudflare
5. In Cloudflare SSL/TLS settings, choose **"Full (strict)"** mode
6. Done — Cloudflare provides free SSL automatically

### Option B: Let's Encrypt (via reverse proxy on another server)

Since Let's Encrypt on Windows directly is complex, use a Linux server as reverse proxy, or use a tool like `win-acme`.

### Option C: Buy an SSL Certificate

1. Purchase a certificate for your domain
2. Install it in Windows certificate store
3. Update the proxy or use IIS as reverse proxy with the certificate

---

## Step 7: Backups

### Database Backup Script

```powershell
# Create backup directory
New-Item -ItemType Directory -Path "C:\backups" -Force

# Create backup script
$backupScript = @'
$date = Get-Date -Format "yyyyMMdd_HHmmss"
$env:PGPASSWORD = "YOUR_DB_PASSWORD"
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -U healthcoin_user -h localhost -d healthcoin_db -F c -f "C:\backups\healthcoin_$date.dump"
# Keep only last 7 backups
Get-ChildItem "C:\backups" | Sort-Object CreationTime -Descending | Select-Object -Skip 7 | Remove-Item -Force
'@
Set-Content -Path "C:\backup-db.ps1" -Value $backupScript

# Schedule daily backup at 3 AM
schtasks /Create /TN "HealthCoin DB Backup" /TR "powershell.exe -File C:\backup-db.ps1" /SC DAILY /ST 03:00 /RU SYSTEM
```

### Restore from Backup

```powershell
$env:PGPASSWORD = "YOUR_DB_PASSWORD"
& "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" -U healthcoin_user -d healthcoin_db -c "C:\backups\healthcoin_20240115_030000.dump"
```

---

## Manual Deployment (Fallback)

If the automated script fails, follow these steps manually:

### 1. Install Chocolatey
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### 2. Install Dependencies
```powershell
choco install postgresql17 --params "/Password:YOUR_DB_PASSWORD" -y
choco install nodejs-lts -y
choco install git -y
```

### 3. Start PostgreSQL
```powershell
Start-Service postgresql-x64-17
Set-Service postgresql-x64-17 -StartupType Automatic
```

### 4. Create Database
```powershell
$env:PGPASSWORD = "YOUR_DB_PASSWORD"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE USER healthcoin_user WITH PASSWORD 'YOUR_DB_PASSWORD';"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE healthcoin_db OWNER healthcoin_user;"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d healthcoin_db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

### 5. Clone and Build
```powershell
cd C:\
git clone https://github.com/tanhabintehasan/health-coin.git
cd healthcoin
npm install
cd apps/api
npx prisma generate
npx prisma migrate deploy
cd C:\healthcoin
npm run build:api
npm run build:web
```

### 6. Create Environment File
Create `C:\healthcoin\apps\api\.env`:
```env
DATABASE_URL=postgresql://healthcoin_user:YOUR_DB_PASSWORD@localhost:5432/healthcoin_db
JWT_SECRET=your_very_long_random_secret_min_32_chars
JWT_REFRESH_SECRET=your_other_very_long_random_secret
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
PORT=3000
APP_URL=http://YOUR_SERVER_IP
CORS_ORIGINS=*
CRON_SECRET=a_random_string
DEMO_LOGIN_ENABLED=true
```

Create `C:\healthcoin\apps\web\.env`:
```env
VITE_API_BASE_URL=http://YOUR_SERVER_IP/api/v1
VITE_DEMO_LOGIN_ENABLED=true
```

### 7. Start Services
```powershell
cd C:\healthcoin\apps\api
npm install -g pm2
pm2 start dist/src/main.js --name healthcoin-api
pm2 save
pm2 startup windows

cd C:\healthcoin
pm2 start proxy-server.js --name healthcoin-proxy
pm2 save
```

### 8. Open Firewall
```powershell
New-NetFirewallRule -DisplayName "HealthCoin-HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "HealthCoin-API" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
New-NetFirewallRule -DisplayName "HealthCoin-HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "PostgreSQL service not found" | Check if installed at `C:\Program Files\PostgreSQL\17\`. If different version, update paths. |
| "npm not recognized" | Restart PowerShell after Node.js installation |
| "Port 80 already in use" | Run `netstat -ano \| findstr :80` and kill the process, or stop IIS: `iisreset /stop` |
| "API returns 404" | Check if API is running: `pm2 status`. Restart with `pm2 restart healthcoin-api` |
| "Cannot connect from internet" | Check Windows Firewall AND cloud provider Security Group |
| "Database connection failed" | Verify PostgreSQL is running: `Get-Service postgresql*`. Check `.env` connection string. |
| "Build fails" | Run `npm install` again, then `npm run build:api` and `npm run build:web` separately |
| "CORS error in browser" | Check `CORS_ORIGINS` in API `.env`. Use `*` for testing, your domain for production. |

---

## Managing the Server

### Check Service Status
```powershell
pm2 status
```

### View API Logs
```powershell
pm2 logs healthcoin-api --lines 100
```

### View Proxy Logs
```powershell
pm2 logs healthcoin-proxy --lines 100
```

### Restart Services
```powershell
pm2 restart all
```

### Update Code (After Git Push)
```powershell
cd C:\healthcoin
git pull origin main
npm install
npm run build:api
npm run build:web
pm2 restart all
```

---

## Security Recommendations

1. **Change RDP password** immediately if it's a default/random password
2. **Disable default Administrator account** and create a new admin user
3. **Restrict RDP access** to your IP only in Windows Firewall and cloud Security Group
4. **Enable Windows Defender** and keep it updated
5. **Set strong database password** (not the same as RDP password)
6. **Use Cloudflare** in front of your server for DDoS protection and SSL
7. **Enable PostgreSQL SSL** for encrypted connections
8. **Regular backups** — set up the scheduled backup script above
9. **Disable DEMO_LOGIN_ENABLED** after going live:
   ```powershell
   # Edit .env files
   notepad C:\healthcoin\apps\api\.env
   notepad C:\healthcoin\apps\web\.env
   # Change DEMO_LOGIN_ENABLED=true to false
   # Rebuild and restart
   npm run build:web
   pm2 restart all
   ```
10. **Set strong CRON_SECRET** and JWT secrets — do not use easy-to-guess strings

---

## Need Help?

If you encounter any errors during deployment:
1. Copy the exact error message
2. Check `pm2 logs healthcoin-api` for API errors
3. Check Windows Event Viewer for system errors
4. Verify your cloud provider's Security Group rules
5. Check that all required ports (80, 443, 3000) are open
