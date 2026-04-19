# HealthCoin — Windows Server Deployment

## One-Command Deployment

Open **PowerShell as Administrator** on your Windows Server and run:

```powershell
# Download and run the deployment script
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/tanhabintehasan/health-coin/main/scripts/deploy-windows.ps1" -OutFile "C:\deploy.ps1"
C:\deploy.ps1
```

Or if you already cloned the repo:

```powershell
cd C:\healthcoin
.\scripts\deploy-windows.ps1
```

The script will ask for:
1. Your server's public IP (or domain)
2. A PostgreSQL password

Then it will **automatically** do everything:
- Remove old installation
- Install PostgreSQL 17, Node.js 20, Git
- Create database and user
- Clone repo, install dependencies
- Create `.env` files
- Apply database migrations
- Set up admin account (13266893239 / coin@Health.12345)
- Build API, Web, and Mini-program
- Start all services with PM2
- Configure Windows Firewall
- Set up daily backups

When finished, visit:
- **Website:** `http://YOUR_SERVER_IP/`
- **API Docs:** `http://YOUR_SERVER_IP/api/docs`

## After Deployment

Edit `C:\healthcoin\apps\api\.env` and fill in your real credentials:
- Fuiou payment credentials
- LCSW payment credentials
- WeChat AppIDs and secrets
- SMSbao credentials
- Aliyun OSS credentials

Then restart:
```powershell
pm2 restart all
```

## Useful Commands

```powershell
pm2 status                  # Check all services
pm2 logs healthcoin-api     # View API logs
pm2 logs healthcoin-proxy   # View proxy logs
pm2 restart all             # Restart everything
```

## Admin Login

- **Phone:** `13266893239`
- **Password:** `coin@Health.12345`
- **Role:** SUPER_ADMIN
