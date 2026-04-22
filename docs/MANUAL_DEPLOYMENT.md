# HealthCoin — Manual Step-by-Step Deployment Guide (Windows Server)

> Follow this guide command-by-command on your RDP server.
> Server IP: `39.98.241.141`

---

## Step 0 — Verify Prerequisites

Open **PowerShell as Administrator** and run:

```powershell
# Check Node.js
node -v
# Expected: v24.14.1 (or newer LTS)

# Check Git
git --version
# Expected: v2.53.0+

# Check PostgreSQL
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" --version
# Expected: 17.x

# Check PM2
pm2 -v
# If missing: npm install -g pm2
```

---

## Step 1 — Create PostgreSQL Database

```powershell
$DbPassword = 'YOUR_STRONG_PASSWORD_HERE'
$DbName = 'healthcoin_db'
$DbUser = 'healthcoin_user'
$pgBin = 'C:\Program Files\PostgreSQL\17\bin'
$env:PGPASSWORD = $DbPassword
```

Run these one by one:

```powershell
& "$pgBin\psql.exe" -U postgres -c "DROP DATABASE IF EXISTS $DbName;"
& "$pgBin\psql.exe" -U postgres -c "DROP USER IF EXISTS $DbUser;"
& "$pgBin\psql.exe" -U postgres -c "CREATE USER $DbUser WITH PASSWORD '$DbPassword';"
& "$pgBin\psql.exe" -U postgres -c "CREATE DATABASE $DbName OWNER $DbUser;"
& "$pgBin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;"
& "$pgBin\psql.exe" -U postgres -d $DbName -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
```

**✅ Expected output:** `DROP DATABASE`, `DROP ROLE`, `CREATE ROLE`, `CREATE DATABASE`, `GRANT`, `CREATE EXTENSION`

---

## Step 2 — Clone Repository

```powershell
$AppDir = 'C:\healthcoin'
$RepoUrl = 'https://github.com/tanhabintehasan/health-coin.git'

# Remove old directory if exists
if (Test-Path $AppDir) { Remove-Item -Recurse -Force $AppDir }

# Clone
git clone --depth 1 --branch main $RepoUrl $AppDir

# Verify
if (-not (Test-Path "$AppDir\package.json")) { Write-Error 'Clone failed!' }
```

If git clone fails, use ZIP fallback:

```powershell
$zipPath = "$env:TEMP\healthcoin.zip"
$zipExtract = "$env:TEMP\healthcoin_zip"
Invoke-WebRequest -Uri 'https://github.com/tanhabintehasan/health-coin/archive/refs/heads/main.zip' -OutFile $zipPath -UseBasicParsing
Expand-Archive -Path $zipPath -DestinationPath $zipExtract -Force
$innerDir = Get-ChildItem -Path $zipExtract -Directory | Select-Object -First 1
Move-Item -Path $innerDir.FullName -Destination $AppDir -Force
Remove-Item -Path $zipPath -Force
Remove-Item -Path $zipExtract -Recurse -Force
```

---

## Step 3 — Install Dependencies

```powershell
Set-Location $AppDir

# Root dependencies
npm install

# API dependencies
Set-Location "$AppDir\apps\api"
npm install

# Web dependencies
Set-Location "$AppDir\apps\web"
npm install

# Mini-program dependencies
Set-Location "$AppDir\apps\miniprogram"
npm install

# Global PM2
npm install -g pm2

# Back to root
Set-Location $AppDir
```

---

## Step 4 — Create Environment Files

### 4.1 API `.env`

```powershell
$ServerIp = '39.98.241.141'
$DbPassword = 'YOUR_STRONG_PASSWORD_HERE'
$AdminPhone = '13266893239'
$AdminPassword = 'coin@Health.12345'

$JwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
$JwtRefreshSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
$CronSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
$LcswEncryptKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
```

Now write the file:

```powershell
$apiEnv = @"
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://healthcoin_user:$DbPassword@localhost:5432/healthcoin_db
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
```

**⚠️ IMPORTANT:** Save the `$JwtSecret` and `$JwtRefreshSecret` values somewhere safe. If you lose them, all existing user sessions will be invalidated.

### 4.2 Web `.env`

```powershell
$webEnv = "VITE_API_BASE_URL=http://$ServerIp/api/v1"
Set-Content -Path "$AppDir\apps\web\.env" -Value $webEnv -Encoding UTF8
```

**⚠️ CRITICAL:** The web MUST use port 80 (proxy), NOT `:3000`. The value above is correct.

---

## Step 5 — Database Migration

```powershell
Set-Location "$AppDir\apps\api"

# Generate Prisma Client
npx prisma generate

# Deploy migrations
npx prisma migrate deploy
```

**✅ Expected:** All migrations apply successfully (7 migrations).

If any migration fails:

```powershell
# Reset everything and retry
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c 'DROP DATABASE IF EXISTS healthcoin_db;'
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c 'CREATE DATABASE healthcoin_db OWNER healthcoin_user;'
npx prisma migrate deploy
```

---

## Step 6 — Create Admin Account

```powershell
Set-Location $AppDir
$env:ADMIN_PHONE = $AdminPhone
$env:ADMIN_PASSWORD = $AdminPassword
$env:ADMIN_NICKNAME = 'Administrator'
node scripts\setup-admin.js
```

**✅ Expected:** `Admin user created/updated successfully`

---

## Step 7 — Build Applications

### 7.1 Build API

```powershell
Set-Location "$AppDir\apps\api"
npm run build
```

### 7.2 Build Web Frontend

```powershell
Set-Location "$AppDir\apps\web"
npm run build
```

### 7.3 Build Mini-Program

```powershell
Set-Location "$AppDir\apps\miniprogram"
npm run build:weapp
```

---

## Step 8 — Start Services

### 8.1 Configure PM2 Startup

```powershell
pm2 startup windows
```

Copy and run the command PM2 outputs (it will look like `pm2 startup windows ...`).

### 8.2 Stop any existing PM2 processes

```powershell
pm2 stop all
pm2 delete all
```

### 8.3 Start API

```powershell
Set-Location "$AppDir\apps\api"
pm2 start dist\src\main.js --name healthcoin-api --restart-delay 3000 --max-restarts 5
```

### 8.4 Start Proxy Server

```powershell
Set-Location $AppDir
pm2 start proxy-server.js --name healthcoin-proxy
```

### 8.5 Save PM2 config

```powershell
pm2 save
```

### 8.6 Check status

```powershell
pm2 status
pm2 logs healthcoin-api --lines 20
```

**✅ Expected:** Both `healthcoin-api` and `healthcoin-proxy` show as `online`.

---

## Step 9 — Firewall Rules

```powershell
# HTTP (port 80)
New-NetFirewallRule -DisplayName 'HealthCoin-HTTP' -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# API (port 3000 — internal, but good to allow)
New-NetFirewallRule -DisplayName 'HealthCoin-API' -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

# HTTPS (port 443 — for future SSL)
New-NetFirewallRule -DisplayName 'HealthCoin-HTTPS' -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

Also open these ports in your **Alibaba Cloud Security Group** if not already done:
- Port 80 (HTTP)
- Port 443 (HTTPS)
- Port 3000 (API — optional, for direct access)

---

## Step 10 — Verify Deployment

Open browser on your local machine (not RDP) and visit:

| URL | Expected Result |
|-----|-----------------|
| `http://39.98.241.141/` | Web frontend loads |
| `http://39.98.241.141/api/docs` | Swagger API documentation |
| `http://39.98.241.141/api/v1/health` | `{ "status": "ok" }` |

---

## Admin Login

| Field | Value |
|-------|-------|
| Phone | `13266893239` (or your `$AdminPhone`) |
| Password | `coin@Health.12345` (or your `$AdminPassword`) |

Login at: `http://39.98.241.141/login`

---

## Useful Commands

```powershell
# View logs
pm2 logs healthcoin-api
pm2 logs healthcoin-proxy

# Restart services
pm2 restart all

# Stop services
pm2 stop all

# Check API health
curl http://localhost:3000/health

# Check proxy
curl http://localhost/api/v1/health
```

---

## Troubleshooting

### "CORS error" in browser
- Make sure web `.env` has `VITE_API_BASE_URL=http://39.98.241.141/api/v1` (NO `:3000`)
- Make sure API `.env` has `CORS_ORIGINS=*`
- Restart both services: `pm2 restart all`

### "prisma migrate deploy failed"
- Drop and recreate the database (Step 1)
- Make sure `CREATE EXTENSION "uuid-ossp"` was run
- Retry Step 5

### "Port 80 already in use"
```powershell
# Find what's using port 80
netstat -ano | findstr :80
# Stop IIS
iisreset /stop
Stop-Service W3SVC
```

### "Git clone failed"
- Use the ZIP fallback in Step 2
- Or download the ZIP manually and extract to `C:\healthcoin`

---

## Done! 🎉

Your HealthCoin platform should now be fully running at:
**http://39.98.241.141/**
