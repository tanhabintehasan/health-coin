# HealthCoin Platform — Local Development Setup (No Docker)

This guide walks you through running the entire HealthCoin platform locally **without Docker**.

---

## 1. Prerequisites

- **Node.js** `>= 18` (LTS recommended)
- **npm** `>= 9`
- **PostgreSQL** `>= 15`
- **Redis** `>= 7`
- **Git**

### Install Node.js
Download from https://nodejs.org/ or use a version manager:
```bash
# Windows (winget)
winget install OpenJS.NodeJS.LTS

# macOS
brew install node

# Ubuntu/Debian
sudo apt update && sudo apt install -y nodejs npm
```

---

## 2. Install PostgreSQL (No Docker)

### Windows
1. Download installer: https://www.postgresql.org/download/windows/
2. Remember the password you set for the `postgres` superuser.
3. Add `C:\Program Files\PostgreSQL\16\bin` to your system `PATH`.

### macOS
```bash
brew install postgresql@16
brew services start postgresql@16
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Create Database & User
Open a `psql` shell as the `postgres` user:

```bash
# macOS / Linux
sudo -u postgres psql

# Windows (SQL Shell)
```

Run:
```sql
CREATE DATABASE healthcoin_db;
CREATE USER healthcoin_user WITH ENCRYPTED PASSWORD 'healthcoin_pass';
GRANT ALL PRIVILEGES ON DATABASE healthcoin_db TO healthcoin_user;
\c healthcoin_db
GRANT ALL ON SCHEMA public TO healthcoin_user;
```

---

## 3. Install Redis (No Docker)

### Windows
- Use **WSL2**:
  ```bash
  sudo apt update && sudo apt install -y redis-server
  sudo service redis-server start
  redis-cli ping  # should reply PONG
  ```

### macOS
```bash
brew install redis
brew services start redis
redis-cli ping
```

### Linux
```bash
sudo apt update && sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
redis-cli ping
```

---

## 4. Environment Variables

### Backend (`apps/api/.env`)
Copy from the example:
```bash
cp apps/api/.env.example apps/api/.env
```

Update `apps/api/.env` with your local database credentials.

### Frontends (`apps/*/ .env`)
```bash
cp apps/user-web/.env.example apps/user-web/.env
cp apps/admin-web/.env.example apps/admin-web/.env
cp apps/merchant-web/.env.example apps/merchant-web/.env
```

---

## 5. Install Dependencies

From the repository root:

```bash
npm install
cd apps/api && npm install
cd ../user-web && npm install
cd ../admin-web && npm install
cd ../merchant-web && npm install
```

---

## 6. Database Initialization

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
```

### Seed Data
```bash
npm install -D tsx
npx tsx prisma/seed-tiers.ts
npx tsx prisma/seed-config.ts
npx tsx prisma/seed-regions.ts
```

---

## 7. Start Services

### Option A — Scripts
**Windows (PowerShell):**
```powershell
.\scripts\start-all.ps1
```

**macOS / Linux:**
```bash
chmod +x scripts/start-all.sh
./scripts/start-all.sh
```

### Option B — Manual
- API: `cd apps/api && npm run dev` → http://localhost:3000
- User Web: `cd apps/user-web && npm run dev` → http://localhost:5173
- Admin Web: `cd apps/admin-web && npm run dev` → http://localhost:5174
- Merchant Web: `cd apps/merchant-web && npm run dev` → http://localhost:5175

---

## 8. Troubleshooting

| Issue | Fix |
|-------|-----|
| PostgreSQL connection refused | Ensure service is running and `DATABASE_URL` is correct |
| Redis connection refused | Run `redis-cli ping` to verify |
| Prisma migrate fails | Check `DATABASE_URL` and ensure DB exists |
| CORS errors | Add your frontend port to `CORS_ORIGINS` in `apps/api/.env` |
| Port already in use | Kill the process or change the port in the app config |

---

## 9. Production Checklist

1. Change JWT secrets to secure random strings.
2. Configure Aliyun SMS credentials for OTP delivery.
3. Configure OSS credentials for file uploads.
4. Configure Fuiou merchant credentials for real payments.
5. Use managed PostgreSQL + Redis in production.
6. Enable HTTPS for all public endpoints.
7. Set `NODE_ENV=production`.
