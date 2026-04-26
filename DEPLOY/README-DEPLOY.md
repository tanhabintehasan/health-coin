# HealthCoin — Final Deployment Guide (GitHub Pull)

## Prerequisites on RDP Server

- Windows Server with PowerShell
- Git installed
- Node.js 20+ installed
- PostgreSQL 17 installed
- PM2 installed globally (`npm install -g pm2`)

---

## Step 1: Delete Old Installation (if exists)

```powershell
# Stop and remove old services
pm2 delete all

# Remove old code
Remove-Item -Recurse -Force C:\healthcoin -ErrorAction SilentlyContinue

# Also clean old PM2 processes
taskkill /F /IM node.exe 2>$null
```

---

## Step 2: Clone from GitHub

```powershell
cd C:\
git clone https://github.com/tanhabintehasan/health-coin.git
Rename-Item health-coin healthcoin
```

> If GitHub HTTPS is blocked, try SSH:
> ```powershell
> git clone git@github.com:tanhabintehasan/health-coin.git
> ```

---

## Step 3: Run Deployment Script

```powershell
cd C:\healthcoin
.\DEPLOY\01-deploy.ps1
```

This script will:
1. Install npm dependencies
2. Prompt for server config (IP, DB password, admin credentials)
3. Create `.env` files
4. Set up PostgreSQL database
5. Run Prisma generate + migrate
6. Seed essential data (tiers, regions, configs)
7. Create admin account
8. Build API + Web frontend
9. Start PM2 services

---

## Step 4: Configure Payments

After Step 3 completes, run:

```powershell
cd C:\healthcoin
.\DEPLOY\02-configure-payments.ps1
```

Enter your credentials:
- **LCSW Merchant No, Terminal ID, Access Token** (from your client)
- **SMSbao Username, Password** (for OTP SMS)
- **WeChat Mini AppID, Secret** (for 小程序登录)

Then restart the API:

```powershell
pm2 restart healthcoin-api
```

---

## Step 5: Verify

| Check | URL / Command |
|-------|--------------|
| Website | `http://YOUR-SERVER-IP/` |
| API Docs | `http://YOUR-SERVER-IP/api/docs` |
| PM2 Status | `pm2 status` |
| API Logs | `pm2 logs healthcoin-api` |

Login to admin:
- URL: `http://YOUR-SERVER-IP/login`
- Use **Password Login** tab
- Phone + password from Step 3

---

## What's Fixed in This Build

| Feature | Status |
|---------|--------|
| **LCSW Payment** | Ready — enter credentials in Step 4 |
| **Coin Payment** | Enabled by default |
| **Fuiou Payment** | Disabled |
| **SMS (SMSbao)** | Ready — enter credentials in Step 4 |
| **WeChat Mini Login** | Ready — enter credentials in Step 4 |
| **Wallet Auto-Create** | Fixed |
| **Wallet BigInt Bug** | Fixed |
| **Coin Offset Rate** | Fixed |
| **Product Audit Logs** | Fixed |
| **Membership Tier Serialization** | Fixed |
| **BigInt JSON Crash** | Fixed globally in main.ts |

---

## Troubleshooting

### "GitHub clone fails"
Try using a proxy or VPN on RDP. Alternative: download as ZIP from GitHub in browser, extract to `C:\healthcoin\`.

### "npm install fails"
Make sure Node.js 20+ is installed: `node -v`

### "psql not found"
Install PostgreSQL 17 or use full path:
```powershell
C:\"Program Files"\PostgreSQL\17\bin\psql.exe
```

### "Port 80 already in use"
```powershell
netstat -ano | findstr :80
taskkill /PID <PID> /F
```

### "Prisma generate fails with EPERM"
```powershell
pm2 stop all
cd C:\healthcoin\apps\api
npm run prisma:generate
pm2 restart all
```

---

## Daily Commands

```powershell
# Check status
pm2 status

# View logs
pm2 logs healthcoin-api

# Restart all
pm2 restart all

# Save config
pm2 save
```

---

## DONE

Your HealthCoin platform is now fully deployed with all fixes applied.
