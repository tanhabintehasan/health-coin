# HealthCoin Platform

A multi-merchant e-commerce platform with a three-currency reward system (Health Coin, Mutual Health Coin, Universal Health Coin), built for the Chinese market.

## Architecture

| Layer | Technology | Hosting |
|-------|------------|---------|
| API | NestJS + TypeScript + Prisma | Netlify Functions |
| Frontends | Vite + React + Ant Design | Netlify |
| Database | PostgreSQL | Supabase |
| File Storage | Aliyun OSS | — |
| SMS | SMSbao | — |
| Payments | Fuiou + LCSW (扫呗) | — |

## Apps

- `apps/api` — Backend REST API
- `apps/web` — Public storefront
- `apps/user-web` — User SPA (orders, wallets, referrals)
- `apps/admin-web` — Admin dashboard
- `apps/merchant-web` — Merchant portal

## Quick Start (Local Development)

### 1. Install dependencies
```bash
npm install
```

### 2. Database
Create a PostgreSQL database and copy `apps/api/.env.example` to `apps/api/.env`:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/healthcoin_db
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

### 3. Run migrations & seeds
```bash
cd apps/api
npx prisma migrate dev
npx prisma db seed
```

### 4. Start all services
```bash
# Windows
.\scripts\start-all.ps1

# macOS / Linux
./scripts/start-all.sh
```

Ports:
- API: `http://localhost:10000`
- Web: `http://localhost:5173`
- Admin: `http://localhost:5174`
- Merchant: `http://localhost:5175`

## Deployment

See [`DEPLOYMENT_ENV.md`](./DEPLOYMENT_ENV.md) for a complete step-by-step production deployment guide.

## Key Environment Variables

### API
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — Token signing secrets
- `APP_URL` — Public API URL
- `CORS_ORIGINS` — Allowed frontend domains
- `CRON_SECRET` — Protects cron endpoints
- `FUIOU_MERCHANT_NO` / `FUIOU_API_KEY` — Fuiou payment credentials
- `OSS_*` — Aliyun OSS credentials

### Frontends
- `VITE_API_BASE_URL` — API base URL (e.g. `https://api.example.com/api/v1`)

## Cron Jobs

The membership auto-upgrade cron is externalized (API runs serverlessly). Register an hourly HTTP call to:

```
POST /api/v1/admin/cron/membership-auto-upgrade
Header: x-cron-secret: YOUR_CRON_SECRET
```

## License

Proprietary — All rights reserved.
