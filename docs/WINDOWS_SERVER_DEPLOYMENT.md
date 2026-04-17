# Windows Server Deployment Guide

> Deploy HealthCoin to a Windows Server (RDP) with local PostgreSQL database.

---

## ⚠️ Important: I Cannot RDP For You

I am an AI running on your local computer. I **cannot directly connect to your RDP server** (39.98.241.141). However, I have created a complete one-click PowerShell script that you can run yourself inside the RDP session.

**What you need to do:**
1. RDP into your server
2. Copy the script to the server
3. Right-click → Run as Administrator
4. Answer the prompts
5. Done

---

## Prerequisites

- Windows Server 2019/2022 or Windows 10/11
- Administrator access
- Internet connection on the server
- Your server IP: `39.98.241.141`
- RDP credentials: `Administrator` / `Ghs123456`

---

## Step 1: RDP Into Your Server

### From Windows:
1. Press `Win + R`, type `mstsc`, press Enter
2. Enter: `39.98.241.141`
3. Click **Connect**
4. Username: `Administrator`
5. Password: `Ghs123456`

### From Mac:
1. Download Microsoft Remote Desktop from App Store
2. Add PC: `39.98.241.141`
3. User account: `Administrator` / `Ghs123456`

---

## Step 2: Download the Deployment Script

Inside the RDP session, open **PowerShell as Administrator**:

```powershell
# Download the deployment script
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/tanhabintehasan/health-coin/main/scripts/deploy-windows.ps1" -OutFile "C:\deploy-windows.ps1"

# Run it
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
C:\deploy-windows.ps1
```

The script will ask you for:
- PostgreSQL password (create a strong one)
- JWT_SECRET (32+ random characters)
- JWT_REFRESH_SECRET (different from JWT_SECRET)
- CRON_SECRET (any random string)

---

## Step 3: Manual Deployment (If Script Fails)

If the automated script doesn't work, follow these manual steps:

### 3.1 Install Chocolatey
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### 3.2 Install PostgreSQL, Node.js, Git, Nginx
```powershell
choco install postgresql17 --params "/Password:YOUR_DB_PASSWORD" -y
choco install nodejs-lts -y
choco install git -y
choco install nginx -y
```

### 3.3 Start PostgreSQL
```powershell
Start-Service postgresql-x64-17
Set-Service postgresql-x64-17 -StartupType Automatic
```

### 3.4 Create Database
```powershell
$env:PGPASSWORD = "YOUR_DB_PASSWORD"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE USER healthcoin_user WITH PASSWORD 'YOUR_DB_PASSWORD';"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE healthcoin_db OWNER healthcoin_user;"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d healthcoin_db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

### 3.5 Clone and Build
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

### 3.6 Create Environment File
Create `C:\healthcoin\apps\api\.env`:
```env
DATABASE_URL=postgresql://healthcoin_user:YOUR_DB_PASSWORD@localhost:5432/healthcoin_db
JWT_SECRET=your_very_long_random_secret_min_32_chars
JWT_REFRESH_SECRET=your_other_very_long_random_secret
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
PORT=3000
APP_URL=http://39.98.241.141
CORS_ORIGINS=*
CRON_SECRET=a_random_string
DEMO_LOGIN_ENABLED=true
```

### 3.7 Start API with PM2
```powershell
cd C:\healthcoin\apps\api
npm install -g pm2
pm2 start dist/src/main.js --name healthcoin-api
pm2 save
pm2 startup windows
```

### 3.8 Configure Nginx
Create `C:\tools\nginx-1.26.\conf\sites-enabled\healthcoin.conf`:
```nginx
server {
    listen 80;
    server_name 39.98.241.141;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root C:\healthcoin\apps\web\dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

Restart Nginx:
```powershell
C:\tools\nginx-1.26.\nginx.exe -s reload
```

### 3.9 Open Firewall
```powershell
New-NetFirewallRule -DisplayName "HealthCoin-HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
```

---

## Step 4: Verify Deployment

Open your browser and visit:
- `http://39.98.241.141/` → Should show the HealthCoin homepage
- `http://39.98.241.141/api/docs` → Should show Swagger API docs
- `http://39.98.241.141/login` → Should show login page

---

## Step 5: Optional — Add SSL (HTTPS)

For production, you should use HTTPS. Options:

### Option A: Buy an SSL Certificate
1. Purchase a certificate for your domain
2. Configure Nginx with the certificate files

### Option B: Use a Domain + Let's Encrypt (via reverse proxy)
Since Let's Encrypt doesn't work well on Windows directly, use a Linux reverse proxy or Cloudflare.

### Option C: Use Cloudflare (Easiest)
1. Buy a domain (e.g., from Namecheap, GoDaddy, Alibaba Cloud)
2. Point domain A record to `39.98.241.141`
3. Add domain to Cloudflare (free plan)
4. Enable "Full (strict)" SSL mode
5. Done — Cloudflare provides free SSL

---

## Step 6: Backup Your Database

Set up automatic backups:

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

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "PostgreSQL service not found" | Check if installed at `C:\Program Files\PostgreSQL\17\`. If different version, update paths. |
| "npm not recognized" | Restart PowerShell after Node.js installation |
| "Port 80 already in use" | Run `netstat -ano \| findstr :80` and kill the process, or change Nginx to port 8080 |
| "API returns 404" | Check if API is running: `pm2 status`. Restart with `pm2 restart healthcoin-api` |
| "Cannot connect from internet" | Check Windows Firewall: `Get-NetFirewallRule \| Where-Object { $_.DisplayName -like "HealthCoin*" }` |
| "Database connection failed" | Verify PostgreSQL is running: `Get-Service postgresql*`. Check `.env` connection string. |

---

## Managing the Server

### Restart API
```powershell
pm2 restart healthcoin-api
```

### View API Logs
```powershell
pm2 logs healthcoin-api --lines 100
```

### Restart Nginx
```powershell
C:\tools\nginx-1.26.\nginx.exe -s reload
```

### Update Code (After Git Push)
```powershell
cd C:\healthcoin
git pull origin main
npm install
npm run build:api
npm run build:web
pm2 restart healthcoin-api
```

---

## Architecture on Windows Server

```
Internet ──► [Windows Firewall :80]
                │
                ▼
           [Nginx :80]
                │
        ┌───────┴───────┐
        ▼               ▼
   /api/* ──►    /* ──►
   [NestJS]      [React SPA]
   :3000         (static files)
        │
        ▼
   [PostgreSQL :5432]
```

---

## Security Recommendations

1. **Change RDP password** from the default `Ghs123456` immediately
2. **Disable default Administrator account** and create a new admin user
3. **Restrict RDP access** to your IP only in Windows Firewall
4. **Enable Windows Defender** and keep it updated
5. **Set strong database password** (not the same as RDP password)
6. **Use Cloudflare** in front of your server for DDoS protection and SSL
7. **Enable PostgreSQL SSL** for encrypted connections
8. **Regular backups** — set up the scheduled backup script above

---

## Need Help?

If you encounter any errors during deployment:
1. Copy the exact error message
2. Check `pm2 logs healthcoin-api` for API errors
3. Check Windows Event Viewer for system errors
4. Send me the error details and I'll help you fix it
