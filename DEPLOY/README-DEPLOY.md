# HealthCoin — Final Deployment Guide (GitHub Pull)

## Prerequisites on RDP Server

- Windows Server with PowerShell
- Git installed
- Node.js 20+ installed
- PostgreSQL 17 installed
- PM2 installed globally (`npm install -g pm2`)

---

## Step 1: Delete Old Installation

```powershell
pm2 delete all
taskkill /F /IM node.exe 2>$null
Remove-Item -Recurse -Force C:\healthcoin -ErrorAction SilentlyContinue
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
> Rename-Item health-coin healthcoin
> ```

---

## Step 3: Run Full Deployment

```powershell
cd C:\healthcoin
.\DEPLOY\01-deploy.ps1
```

This script will:
1. Install npm dependencies
2. Prompt for server config (IP, DB password, admin credentials, JWT secrets)
3. Create `.env` files
4. Set up PostgreSQL database
5. Run Prisma generate + migrate
6. Seed essential data (tiers, regions, configs)
7. **Auto-insert LCSW payment credentials** (Merchant: 858404816000329, Terminal: 19750857)
8. **Auto-insert SMSbao credentials** (Username: CX3308)
9. Create admin account
10. Build API + Web frontend
11. Start PM2 services

> **You do NOT need to enter LCSW or SMS credentials** — they are pre-configured.

---

## Step 4: Optional — Add WeChat Mini Program

If you have WeChat Mini AppID + Secret, run:

```powershell
cd C:\healthcoin
.\DEPLOY\02-configure-payments.ps1
```

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

## Pre-Configured Settings

| Setting | Value | Location |
|---------|-------|----------|
| **LCSW Merchant No** | 858404816000329 | Database |
| **LCSW Terminal ID** | 19750857 | Database |
| **LCSW Access Token** | ce55099502be4106a38890be2e4fe787 | Database |
| **LCSW Base URL** | http://pay.lcsw.cn/lcsw | Database |
| **SMSbao Username** | CX3308 | Database + .env |
| **SMSbao Password** | d246e48c94264b2f8a2dbe17877e8a7d | Database + .env |
| **Primary Payment** | LCSW | Database |
| **Fuiou Payment** | Disabled | Database |
| **Coin Payment** | Enabled | Database |

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

Your HealthCoin platform is now fully deployed with LCSW payment and SMS ready.
