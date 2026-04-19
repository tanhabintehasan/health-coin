# HealthCoin — Fresh Windows Server Deployment Guide

> **Deploy from scratch on a clean Windows Server**  
> **Target:** Windows Server 2019/2022  
> **Server IP:** `39.98.241.141`

---

## PART 1: Remove Previous Installation (If Any)

### Step 1.1 — Stop All Running Services

Open **PowerShell as Administrator** and run:

```powershell
# Stop all PM2 processes
pm2 stop all 2>$null
pm2 delete all 2>$null

# Stop IIS if running
iisreset /stop 2>$null
Stop-Service W3SVC -ErrorAction SilentlyContinue

# Verify nothing is using ports 80, 3000, 3001
netstat -ano | Select-String ":80\s|:3000\s|:3001\s"
```

### Step 1.2 — Remove Deployment Directory

```powershell
# Delete old project
Remove-Item -Path "C:\healthcoin" -Recurse -Force -ErrorAction SilentlyContinue

# Verify deletion
if (Test-Path "C:\healthcoin") {
    Write-Host "Failed to delete C:\healthcoin — check permissions" -ForegroundColor Red
} else {
    Write-Host "Old deployment removed" -ForegroundColor Green
}
```

### Step 1.3 — Remove Database (Optional)

```powershell
$env:PGPASSWORD = "your_postgres_password"
$pgBin = "C:\Program Files\PostgreSQL\17\bin"

# Drop existing database
& "$pgBin\psql.exe" -U postgres -c "DROP DATABASE IF EXISTS healthcoin_db;"

# Drop existing user
& "$pgBin\psql.exe" -U postgres -c "DROP USER IF EXISTS healthcoin_user;"
```

### Step 1.4 — Remove PM2 Startup Script

```powershell
pm2 unstartup 2>$null
```

### Step 1.5 — Remove Scheduled Backup Tasks

```powershell
Unregister-ScheduledTask -TaskName "HealthCoin Daily Backup" -Confirm:$false -ErrorAction SilentlyContinue
```

---

## PART 2: Fresh Installation

### Step 2.1 — Install Prerequisites

#### A) Node.js 20 LTS

1. Download: https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi
2. Run installer → Next → Next → Install
3. Verify:

```powershell
node --version   # v20.18.0
npm --version    # 10.8.2
```

#### B) Git for Windows

1. Download: https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe
2. Run installer → Use default settings → Install
3. Verify:

```powershell
git --version    # git version 2.47.1
```

#### C) PostgreSQL 17

1. Download: https://sbp.enterprisedb.com/getfile.jsp?fileid=1259100
2. Run installer:
   - **Password:** `YourStrongPostgresPassword123!`
   - **Port:** 5432
   - **Locale:** Default
3. Verify:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" --version
```

#### D) PM2 (Global)

```powershell
npm install -g pm2
pm2 --version
```

---

### Step 2.2 — Create Database

```powershell
$env:PGPASSWORD = "YourStrongPostgresPassword123!"
$pgBin = "C:\Program Files\PostgreSQL\17\bin"

# Create database
& "$pgBin\psql.exe" -U postgres -c "CREATE DATABASE healthcoin_db;"

# Create app user
& "$pgBin\psql.exe" -U postgres -c "CREATE USER healthcoin_user WITH PASSWORD 'YourAppDbPassword456!';"

# Grant privileges
& "$pgBin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE healthcoin_db TO healthcoin_user;"

# Verify
& "$pgBin\psql.exe" -U healthcoin_user -d healthcoin_db -c "SELECT 1;"
```

---

### Step 2.3 — Create Directories

```powershell
New-Item -ItemType Directory -Path "C:\healthcoin" -Force
New-Item -ItemType Directory -Path "C:\backups" -Force
```

---

### Step 2.4 — Clone Repository

```powershell
cd C:\healthcoin
git clone https://github.com/tanhabintehasan/health-coin.git .
```

---

### Step 2.5 — Install Dependencies

```powershell
cd C:\healthcoin
npm install
```

This installs all workspace dependencies automatically.

---

### Step 2.6 — Configure Environment Variables

#### API Environment (`apps\api\.env`)

Create the file:

```powershell
notepad C:\healthcoin\apps\api\.env
```

Paste this (replace ALL placeholder values):

```env
# ============================================
# NODE ENVIRONMENT
# ============================================
NODE_ENV=production
PORT=3000

# ============================================
# DATABASE
# ============================================
DATABASE_URL=postgresql://healthcoin_user:YourAppDbPassword456!@localhost:5432/healthcoin_db

# ============================================
# JWT (Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
# ============================================
JWT_SECRET=REPLACE_WITH_64_CHAR_HEX_STRING
JWT_REFRESH_SECRET=REPLACE_WITH_DIFFERENT_64_CHAR_HEX_STRING
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# CORS (Your actual domains)
# ============================================
CORS_ORIGINS=https://yourdomain.com

# ============================================
# ADMIN SETUP
# ============================================
ADMIN_PHONE=13266893239
ADMIN_PASSWORD=coin@Health.12345
ADMIN_NICKNAME=Administrator

# ============================================
# FUIOU PAYMENT
# ============================================
FUIOU_MERCHANT_NO=
FUIOU_API_KEY=
FUIOU_GATEWAY_URL=https://pay.fuiou.com
FUIOU_MOCK_PAYMENTS=false

# ============================================
# LCSW / 扫呗 PAYMENT
# ============================================
LCSW_MERCHANT_NO=
LCSW_APPID=
LCSW_APP_SECRET=
LCSW_ACCESS_TOKEN=
LCSW_BASE_URL=https://openapi.lcsw.cn
LCSW_ENCRYPTION_KEY=

# ============================================
# WECHAT MINI PROGRAM
# ============================================
WECHAT_MINI_APPID=wxYOURAPPIDHERE
WECHAT_MINI_SECRET=

# ============================================
# WECHAT WEB OAUTH
# ============================================
WECHAT_APPID=wxYOURWEBAPPID
WECHAT_SECRET=

# ============================================
# SMSBAO
# ============================================
SMSBAO_USERNAME=
SMSBAO_PASSWORD=

# ============================================
# ALIYUN OSS
# ============================================
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com

# ============================================
# PLATFORM
# ============================================
PLATFORM_NAME=HealthCoin
PLATFORM_COMMISSION_RATE=0.05
```

**Generate JWT secrets now:**

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy the output and paste as JWT_SECRET

node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy the output and paste as JWT_REFRESH_SECRET
```

Save and close Notepad.

#### Web Frontend Environment (`apps\web\.env`)

```powershell
notepad C:\healthcoin\apps\web\.env
```

Paste:

```env
VITE_API_BASE_URL=https://yourdomain.com/api/v1
```

Save and close.

#### Mini-Program Config (`apps\miniprogram\project.config.json`)

Edit the `appid` field to your real WeChat mini-program AppID.

---

### Step 2.7 — Generate Prisma Client

```powershell
cd C:\healthcoin\apps\api
npx prisma generate
```

---

### Step 2.8 — Apply Database Migration

```powershell
cd C:\healthcoin\apps\api
npx prisma migrate deploy
```

If this fails with shadow database error:

```powershell
npx prisma migrate resolve --applied 20260419085653_add_password_and_profile_fields
npx prisma generate
```

---

### Step 2.9 — Set Up Admin Account

```powershell
cd C:\healthcoin
$env:ADMIN_PHONE = "13266893239"
$env:ADMIN_PASSWORD = "coin@Health.12345"
$env:ADMIN_NICKNAME = "Administrator"
node scripts\setup-admin.js
```

You should see:
```
✅ User created with 3 wallets.
✅ Admin role (SUPER_ADMIN) assigned.
```

---

### Step 2.10 — Build All Applications

```powershell
# Build API
cd C:\healthcoin\apps\api
npm run build

# Build Web
cd C:\healthcoin\apps\web
npm run build

# Build Mini-Program
cd C:\healthcoin\apps\miniprogram
npm run build:weapp
```

All three must complete with **no errors**.

---

### Step 2.11 — Start Services with PM2

```powershell
# Start API
cd C:\healthcoin\apps\api
pm2 start dist\src\main.js --name healthcoin-api --restart-delay 3000 --max-restarts 5

# Start Proxy
cd C:\healthcoin
pm2 start proxy-server.js --name healthcoin-proxy

# Save configuration
pm2 save
pm2 startup
```

Follow the output instructions from `pm2 startup` to create the Windows service.

---

### Step 2.12 — Configure Windows Firewall

```powershell
# HTTP
New-NetFirewallRule -DisplayName "HealthCoin HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# HTTPS
New-NetFirewallRule -DisplayName "HealthCoin HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

---

### Step 2.13 — Verify Deployment

```powershell
# Check API
curl http://localhost:3000/api/v1/settings/public

# Check Web
curl http://localhost:3001
```

Open browser to `http://YOUR_SERVER_IP/login` and test admin login:
- Phone: `13266893239`
- Password: `coin@Health.12345`

---

## PART 3: Post-Installation Setup

### 3.1 — Configure WeChat Mini-Program

1. Open **WeChat Developer Tools**
2. Import project from `C:\healthcoin\apps\miniprogram`
3. Set AppID to your real mini-program AppID
4. In **WeChat MP Admin Console** → **开发管理** → **开发设置**:
   - Add `https://yourdomain.com` to **request合法域名**
5. Upload and submit for review

### 3.2 — Configure System Settings (Admin Panel)

Log in as admin, go to **Settings**, and configure:

| Setting | Value |
|---------|-------|
| `platform_name` | Your brand name |
| `platform_hotline` | Customer service phone |
| `smsbao_username` | Your SMSbao username |
| `wechat_appid` | Web OAuth app ID |
| `wechat_mini_appid` | Mini-program app ID |
| `fuiou_merchant_no` | Fuiou merchant number |
| `lcsw_merchant_no` | LCSW merchant number |

### 3.3 — Set Up Daily Backups

```powershell
# Create backup script
$backupScript = @'
$date = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "C:\backups"
$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$env:PGPASSWORD = "YourStrongPostgresPassword123!"

New-Item -ItemType Directory -Path $backupDir -Force
& "$pgBin\pg_dump.exe" -h localhost -U postgres -d healthcoin_db -F c -f "$backupDir\healthcoin-$date.dump"
Get-ChildItem $backupDir -Filter "healthcoin-*.dump" | Sort-Object Name -Descending | Select-Object -Skip 30 | Remove-Item -Force
'@

$backupScript | Out-File -FilePath "C:\healthcoin\scripts\backup-db.ps1" -Encoding UTF8

# Schedule daily at 2 AM
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File C:\healthcoin\scripts\backup-db.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName "HealthCoin Daily Backup" -Action $action -Trigger $trigger -Force
```

---

## Quick Reference Commands

```powershell
# View logs
pm2 logs healthcoin-api

# Restart all
pm2 restart all

# Check status
pm2 status

# View API env
Get-Content C:\healthcoin\apps\api\.env

# Backup database manually
$env:PGPASSWORD = "YourStrongPostgresPassword123!"
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -h localhost -U postgres -d healthcoin_db -F c -f "C:\backups\manual-backup.dump"

# Restore database
$env:PGPASSWORD = "YourStrongPostgresPassword123!"
& "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" -h localhost -U postgres -d healthcoin_db -c "C:\backups\manual-backup.dump"
```

---

**Deployment Complete!**
