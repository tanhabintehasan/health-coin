# HealthCoin Platform

A multi-vendor e-commerce platform with a three-coin reward system, two-level referral, merchant management, redemption codes, and Fuiou payment integration.

## Architecture

- **API** — NestJS + Prisma + PostgreSQL + Redis (Bull queues)
- **User Web** — Vite + React + React Router (converted from Taro mini-program)
- **Admin Web** — Vite + React + Ant Design
- **Merchant Web** — Vite + React + Ant Design
- **Miniprogram** — Taro (legacy, retained for reference)

## Quick Start

See [`LOCAL_DEV_SETUP.md`](LOCAL_DEV_SETUP.md) for detailed local setup instructions without Docker.

### One-line startup

```bash
# Install dependencies in root and each app
npm install
cd apps/api && npm install && cd ../user-web && npm install && cd ../admin-web && npm install && cd ../merchant-web && npm install

# Start all services
# Windows:
.\scripts\start-all.ps1

# macOS / Linux:
chmod +x scripts/start-all.sh
./scripts/start-all.sh
```

Services will be available at:
- API: http://localhost:3000
- User Web: http://localhost:5173
- Admin Web: http://localhost:5174
- Merchant Web: http://localhost:5175

## Deployment

### API (Render / Railway / VPS)

1. Set the build command:
   ```bash
   cd apps/api && npm install && npm run build
   ```
2. Set the start command:
   ```bash
   cd apps/api && npm run start
   ```
3. Required environment variables (see `apps/api/.env.example`):
   - `DATABASE_URL`
   - `REDIS_HOST`, `REDIS_PORT`
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`
   - `APP_URL`, `CORS_ORIGINS`
   - `FUIOU_MERCHANT_NO`, `FUIOU_API_KEY` (for payments)
   - `ALIYUN_*` credentials (for SMS OTP)
   - `OSS_*` credentials (for file uploads)
4. Run migrations and seeds once:
   ```bash
   npx prisma migrate deploy
   npx tsx prisma/seed-tiers.ts
   npx tsx prisma/seed-config.ts
   ```

### Frontends (Netlify)

Each frontend app includes a `netlify.toml` ready for deployment:

- **User Web**: `apps/user-web/netlify.toml`
- **Admin Web**: `apps/admin-web/netlify.toml`
- **Merchant Web**: `apps/merchant-web/netlify.toml`

Set the environment variable in each Netlify site:
```env
VITE_API_BASE_URL=https://your-api-domain.com/api/v1
```

### Docker Compose (optional)

A `docker-compose.yml` is provided at the repo root for local containerized development:
```bash
docker-compose up -d
```
This starts PostgreSQL, Redis, and MeiliSearch.

## Verified Features

| Feature | Status |
|---------|--------|
| 6-level membership system | ✅ |
| Three currencies (Health, Mutual, Universal) | ✅ |
| Two-level referral rewards | ✅ |
| Region-based rewards | ✅ |
| Merchant system | ✅ |
| Redemption codes | ✅ |
| Fuiou payment integration | ✅ |

## Security Notes

- Never commit real `.env` files or secrets.
- Change default JWT secrets before deploying to production.
- Keep `FUIOU_API_KEY` and database credentials in a secure secrets manager.
