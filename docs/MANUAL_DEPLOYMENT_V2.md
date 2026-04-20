# HealthCoin — Manual Deployment (Step-by-Step) v2

> Run every command **one-by-one** in PowerShell as Administrator on RDP.
> Do NOT run them all at once — stop and verify after each step.

---

## Step 0 — Set Variables (Run This First)

```powershell
$ServerIp     = '39.98.241.141'
$DbPassword   = 'YOUR_DB_PASSWORD_HERE'
$AdminPhone   = '13266893239'
$AdminPassword= 'coin@Health.12345'
$AppDir       = 'C:\healthcoin'
$pgBin        = 'C:\Program Files\PostgreSQL\17\bin'
```

Replace `YOUR_DB_PASSWORD_HERE` with your actual PostgreSQL password.

---

## Step 1 — Database Setup

```powershell
$env:PGPASSWORD = $DbPassword

# 1.1 Drop old database
& "$pgBin\psql.exe" -U postgres -c 'DROP DATABASE IF EXISTS healthcoin_db;'

# 1.2 Drop old user
& "$pgBin\psql.exe" -U postgres -c 'DROP USER IF EXISTS healthcoin_user;'

# 1.3 Create user
& "$pgBin\psql.exe" -U postgres -c "CREATE USER healthcoin_user WITH PASSWORD '$DbPassword';"

# 1.4 Create database
& "$pgBin\psql.exe" -U postgres -c 'CREATE DATABASE healthcoin_db OWNER healthcoin_user;'

# 1.5 Grant privileges
& "$pgBin\psql.exe" -U postgres -c 'GRANT ALL PRIVILEGES ON DATABASE healthcoin_db TO healthcoin_user;'

# 1.6 Enable UUID extension
& "$pgBin\psql.exe" -U postgres -d healthcoin_db -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
```

**✅ Verify:** Each command should show `DROP DATABASE`, `DROP ROLE`, `CREATE ROLE`, `CREATE DATABASE`, `GRANT`, `CREATE EXTENSION`.

---

## Step 2 — Clone Repository

```powershell
# Remove old directory if it exists
if (Test-Path $AppDir) { Remove-Item -Recurse -Force $AppDir }

# Clone
git clone --depth 1 --branch main https://github.com/tanhabintehasan/health-coin.git $AppDir
```

**If git clone fails** (network error), use ZIP fallback:

```powershell
$zipPath = "$env:TEMP\healthcoin.zip"
$zipExtract = "$env:TEMP\healthcoin_extract"
Invoke-WebRequest -Uri 'https://github.com/tanhabintehasan/health-coin/archive/refs/heads/main.zip' -OutFile $zipPath -UseBasicParsing
Expand-Archive -Path $zipPath -DestinationPath $zipExtract -Force
$innerDir = Get-ChildItem -Path $zipExtract -Directory | Select-Object -First 1
Move-Item -Path $innerDir.FullName -Destination $AppDir -Force
Remove-Item -Path $zipPath -Force
Remove-Item -Path $zipExtract -Recurse -Force
```

**✅ Verify:**
```powershell
Test-Path "$AppDir\package.json"
```
Should return `True`.

---

## Step 3 — Install Dependencies

```powershell
# 3.1 Go to root
Set-Location $AppDir

# 3.2 Install ALL dependencies (use --legacy-peer-deps to fix Taro conflicts)
npm install --legacy-peer-deps
```

This will take 2–5 minutes. Wait for it to finish.

**✅ Verify:** Check that Prisma is installed locally:
```powershell
Test-Path "$AppDir\node_modules\prisma\package.json"
```
Should return `True`.

If the above is `False`, install API dependencies directly:
```powershell
Set-Location "$AppDir\apps\api"
npm install --legacy-peer-deps
Set-Location "$AppDir\apps\web"
npm install --legacy-peer-deps
Set-Location $AppDir
```

---

## Step 4 — Create Environment Files

### 4.1 Generate Secrets

```powershell
function Get-RandomString($length) {
    return -join ((48..57) + (65..90) + (97..122) | Get-Random -Count $length | ForEach-Object { [char]$_ })
}

$JwtSecret        = Get-RandomString(64)
$JwtRefreshSecret = Get-RandomString(64)
$CronSecret       = Get-RandomString(32)
$LcswEncryptKey   = Get-RandomString(32)
```

### 4.2 Write API .env

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

New-Item -ItemType Directory -Path "$AppDir\apps\api" -Force | Out-Null
Set-Content -Path "$AppDir\apps\api\.env" -Value $apiEnv -Encoding UTF8
```

**⚠️ Save the JWT_SECRET and JWT_REFRESH_SECRET values somewhere safe.**

### 4.3 Write Web .env

```powershell
$webEnv = "VITE_API_BASE_URL=http://$ServerIp/api/v1"
New-Item -ItemType Directory -Path "$AppDir\apps\web" -Force | Out-Null
Set-Content -Path "$AppDir\apps\web\.env" -Value $webEnv -Encoding UTF8
```

**✅ Verify:**
```powershell
Get-Content "$AppDir\apps\api\.env" | Select-Object -First 3
Get-Content "$AppDir\apps\web\.env"
```

---

## Step 5 — Prisma Generate & Database Migrate

> ⚠️ Use `npm run` scripts instead of `npx prisma` to avoid downloading Prisma 7.

```powershell
# 5.1 Go to API directory
Set-Location "$AppDir\apps\api"

# 5.2 Generate Prisma Client (uses local Prisma 5.x)
npm run prisma:generate
```

**✅ Verify:** Should show `Generated Prisma Client (v5.22.0)`.

```powershell
# 5.3 Deploy migrations
npm run prisma:migrate:deploy
```

**✅ Verify:** Should show all migrations applied:
- `20260331151224_init`
- `20260331151225_restructure`
- `20260401073032_add_delivery_type_coin_offset`
- `20260416000000_add_lcsw_trade_no`
- `20260416100000_add_otp_refresh_cart`
- `20260416110000_add_lcsw_institution_and_transactions`
- `20260419085653_add_password_and_profile_fields`

If migration fails:
```powershell
# Nuclear option: reset DB and retry
$env:PGPASSWORD = $DbPassword
& "$pgBin\psql.exe" -U postgres -c 'DROP DATABASE IF EXISTS healthcoin_db;'
& "$pgBin\psql.exe" -U postgres -c 'CREATE DATABASE healthcoin_db OWNER healthcoin_user;'
& "$pgBin\psql.exe" -U postgres -c 'GRANT ALL PRIVILEGES ON DATABASE healthcoin_db TO healthcoin_user;'
& "$pgBin\psql.exe" -U postgres -d healthcoin_db -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
npm run prisma:migrate:deploy
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

**✅ Verify:** Should show `Admin user created/updated successfully`.

---

## Step 7 — Build Applications

### 7.1 Build API

```powershell
Set-Location "$AppDir\apps\api"
npm run build
```

**✅ Verify:** No errors. Check `dist` folder exists:
```powershell
Test-Path "$AppDir\apps\api\dist\src\main.js"
```

### 7.2 Build Web

```powershell
Set-Location "$AppDir\apps\web"
npm run build
```

**✅ Verify:** Check dist exists:
```powershell
Test-Path "$AppDir\apps\web\dist\index.html"
```

### 7.3 Build Mini-Program (Optional)

```powershell
Set-Location "$AppDir\apps\miniprogram"
npm run build:weapp
```

If this fails, it's OK — miniprogram is not required for website/API to work.

---

## Step 8 — Start Services with PM2

### 8.1 Install/Configure PM2

```powershell
npm install -g pm2
pm2 startup windows
```

Run the command PM2 outputs (copy-paste it).

### 8.2 Stop Old Processes

```powershell
pm2 stop all
pm2 delete all
```

### 8.3 Start API

```powershell
Set-Location "$AppDir\apps\api"
pm2 start dist\src\main.js --name healthcoin-api --restart-delay 3000 --max-restarts 5
```

### 8.4 Start Proxy

```powershell
Set-Location $AppDir
pm2 start proxy-server.js --name healthcoin-proxy
```

### 8.5 Save & Check

```powershell
pm2 save
pm2 status
```

**✅ Verify:** Both `healthcoin-api` and `healthcoin-proxy` show as `online`.

Check logs if any show as `errored`:
```powershell
pm2 logs healthcoin-api --lines 30
```

---

## Step 9 — Firewall Rules

```powershell
# Stop IIS if running
iisreset /stop
Stop-Service W3SVC -ErrorAction SilentlyContinue

# Add firewall rules
New-NetFirewallRule -DisplayName 'HealthCoin-HTTP'  -Direction Inbound -Protocol TCP -LocalPort 80  -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName 'HealthCoin-API'   -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName 'HealthCoin-HTTPS' -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow -ErrorAction SilentlyContinue
```

**Also open ports 80 and 443 in your Alibaba Cloud Security Group.**

---

## Step 10 — Verify Everything

From your **local computer** (not RDP), open browser:

| URL | Expected |
|-----|----------|
| `http://39.98.241.141/` | Website loads |
| `http://39.98.241.141/api/docs` | Swagger API docs |
| `http://39.98.241.141/api/v1/health` | `{"status":"ok"}` |

**Admin Login:**
- URL: `http://39.98.241.141/login`
- Phone: `13266893239`
- Password: `coin@Health.12345`

---

## Quick Commands (After Deployed)

```powershell
# Check status
pm2 status

# View API logs
pm2 logs healthcoin-api

# View proxy logs
pm2 logs healthcoin-proxy

# Restart all
pm2 restart all

# Stop all
pm2 stop all
```

---

## Troubleshooting

### "Cannot find module 'prisma'"
You ran `npx prisma` which downloaded Prisma 7. Always use:
```powershell
cd C:\healthcoin\apps\api
npm run prisma:generate
npm run prisma:migrate:deploy
```

### "npm install failed with peer dependency errors"
Make sure you used `--legacy-peer-deps`:
```powershell
cd C:\healthcoin
npm install --legacy-peer-deps
```

### "Port 80 already in use"
```powershell
netstat -ano | findstr :80
iisreset /stop
Stop-Service W3SVC
```

### "CORS error in browser"
1. Check web `.env` has `http://39.98.241.141/api/v1` (NO `:3000`)
2. Check API `.env` has `CORS_ORIGINS=*`
3. Restart: `pm2 restart all`
