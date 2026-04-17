# HealthCoin Platform

A unified multi-merchant e-commerce platform with a three-currency reward system (Health Coin, Mutual Health Coin, Universal Health Coin).

## Architecture

| Component | Technology | Hosting |
|-----------|------------|---------|
| **Unified Web App** | Vite + React + Ant Design | Netlify |
| **API** | NestJS + TypeScript + Prisma | Netlify Functions (same site) |
| **Database** | PostgreSQL | Supabase |
| **File Storage** | Aliyun OSS | — |
| **SMS** | SMSbao | — |
| **Payments** | Fuiou + LCSW (扫呗) | — |

## Repository Structure

```
health-coin/
├── apps/
│   ├── api/          ← NestJS REST API (deployed as Netlify Functions)
│   └── web/          ← Unified frontend: Public Storefront + User + Merchant + Admin
├── supabase/
│   ├── schema.sql    ← PostgreSQL schema
│   └── seed.sql      ← Seed data (tiers, regions, demo users, configs)
├── scripts/
│   ├── start-all.ps1 ← Windows dev launcher
│   └── start-all.sh  ← macOS/Linux dev launcher
├── netlify.toml      ← Unified deployment config (web + API functions)
├── package.json      ← Workspace root
└── DEPLOYMENT_ENV.md ← Production deployment guide
```

## Quick Start (Local Development)

### 1. Install dependencies
```bash
npm install
```

### 2. Database
Create a PostgreSQL database and copy `apps/api/.env.example` → `apps/api/.env`:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/healthcoin_db
JWT_SECRET=change_this_to_a_secure_random_string
JWT_REFRESH_SECRET=change_this_to_a_different_secure_random_string
```

### 3. Run migrations & seeds
```bash
cd apps/api
npx prisma migrate dev
npx prisma db seed
```

### 4. Start dev servers
```bash
# API only
npm run dev:api

# Web app only
npm run dev:web

# Or start both
.\scripts\start-all.ps1   # Windows
./scripts/start-all.sh     # macOS / Linux
```

Ports:
- API: `http://localhost:10000`
- Web app: `http://localhost:5173`

## Application Flow

### Public (no login required)
- `/` — Homepage
- `/shop` — Browse products with filters
- `/product/:id` — Product details & add to cart
- `/merchant-join` — Merchant application info
- `/about` — About us
- `/contact` — Contact us

### Auth
- `/login` — Phone + OTP login
- `/register` — Auto-registration with OTP

### User Portal
- `/portal/user/home` — Dashboard
- `/portal/user/cart` — Cart
- `/portal/user/orders` — Orders
- `/portal/user/order/:id` — Order detail & payment
- `/portal/user/wallet` — Coin balances & transactions
- `/portal/user/referral` — Referral tree & QR code
- `/portal/user/profile` — Profile settings
- `/portal/user/health` — Health records

### Merchant Portal
- `/portal/merchant/dashboard` — Stats
- `/portal/merchant/products` — Manage products
- `/portal/merchant/orders` — Fulfill orders
- `/portal/merchant/redemption` — Scan redemption codes

### Admin Portal
- `/portal/admin/dashboard` — Platform overview & statistics
- `/portal/admin/users` — Members & wallets
- `/portal/admin/merchants` — Merchant approval
- `/portal/admin/products` — Product review
- `/portal/admin/orders` — Order management
- `/portal/admin/withdrawals` — Payout approval
- `/portal/admin/settings` — System configuration

## Demo Login

For client review, a **Demo Login** section appears on the `/login` page.

Demo accounts (seeded automatically):
| Role | Phone | Portal |
|------|-------|--------|
| Admin | `13800000001` | `/portal/admin/dashboard` |
| Merchant | `13800000002` | `/portal/merchant/dashboard` |
| User | `13800000004` | `/portal/user/home` |

Controlled by environment variables:
- Backend: `DEMO_LOGIN_ENABLED=true`
- Frontend: `VITE_DEMO_LOGIN_ENABLED=true`

## Deployment

See [`DEPLOYMENT_ENV.md`](./DEPLOYMENT_ENV.md) for a complete single-site deployment guide on Netlify + Supabase.

### Key Environment Variables

**Backend / API:**
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — Token secrets
- `APP_URL` — Public site URL
- `CORS_ORIGINS` — Allowed origins (usually just the site itself)
- `CRON_SECRET` — Protects cron endpoints
- `FUIOU_MERCHANT_NO` / `FUIOU_API_KEY` — Payment credentials
- `OSS_*` — Aliyun OSS credentials

**Frontend:**
- `VITE_API_BASE_URL` — API base URL (e.g. `https://yoursite.netlify.app/api/v1`)
- `VITE_DEMO_LOGIN_ENABLED` — Show demo login buttons (`true` / `false`)

## Cron Jobs

The membership auto-upgrade runs via an external cron service (the API is serverless). Register an hourly call to:

```
POST /api/v1/admin/cron/membership-auto-upgrade
Header: x-cron-secret: YOUR_CRON_SECRET
```

## License

Proprietary — All rights reserved.
