# HealthCoin Platform

A unified multi-merchant e-commerce platform with a three-currency reward system (Health Coin, Mutual Health Coin, Universal Health Coin).

## Architecture

| Component | Technology | Hosting |
|-----------|------------|---------|
| **Web App** | Vite + React + Ant Design | Windows Server (Express Proxy) |
| **API** | NestJS + TypeScript + Prisma | Windows Server (PM2 + Node.js) |
| **Database** | PostgreSQL 17 | Same Windows Server |
| **SMS** | SMSbao | — |
| **Payments** | Fuiou + LCSW (扫呗) | — |

## Repository Structure

```
health-coin/
├── apps/
│   ├── api/          ← NestJS REST API
│   ├── miniprogram/  ← WeChat mini-program (Taro)
│   └── web/          ← Unified frontend: Public Storefront + User + Merchant + Admin
├── supabase/
│   ├── schema.sql    ← PostgreSQL schema
│   └── seed.sql      ← Seed data (tiers, regions, demo users, configs)
├── scripts/
│   ├── deploy-windows.ps1  ← One-click Windows Server deployment
│   ├── start-all.ps1       ← Windows dev launcher
│   └── start-all.sh        ← macOS/Linux dev launcher
├── docs/
│   └── WINDOWS_SERVER_DEPLOYMENT.md  ← Full deployment guide
├── proxy-server.js   ← Express production proxy (port 80)
└── package.json      ← Workspace root
```

## Quick Start (Local Development)

```bash
npm install
cd apps/api && npx prisma migrate dev && npx prisma db seed
cd ../..
```

**Windows:**
```powershell
.\scripts\start-all.ps1
```

**macOS/Linux:**
```bash
./scripts/start-all.sh
```

Ports:
- API: `http://localhost:10000`
- Web app: `http://localhost:5173`

## Application Flow

### Public (no login)
- `/` — Homepage
- `/shop` — Browse products
- `/product/:id` — Product details

### Auth
- `/login` — Phone + OTP login (or Demo Login for testing)

### User Portal
- `/portal/user/home` — Dashboard
- `/portal/user/cart` — Cart
- `/portal/user/orders` — Orders
- `/portal/user/wallet` — Coin balances

### Merchant Portal
- `/portal/merchant/dashboard` — Stats
- `/portal/merchant/products` — Manage products
- `/portal/merchant/orders` — Fulfill orders

### Admin Portal
- `/portal/admin/dashboard` — Platform overview
- `/portal/admin/users` — Members & wallets
- `/portal/admin/merchants` — Merchant approval
- `/portal/admin/settings` — System configuration (SMS, Payments, Coin rates)

## Demo Login

Demo accounts (seeded automatically):

| Role | Phone | Portal |
|------|-------|--------|
| Admin | `13800000001` | `/portal/admin/dashboard` |
| Merchant | `13800000002` | `/portal/merchant/dashboard` |
| User | `13800000004` | `/portal/user/home` |

## Production Deployment

**Target:** Windows Server RDP

See [`docs/WINDOWS_SERVER_DEPLOYMENT.md`](./docs/WINDOWS_SERVER_DEPLOYMENT.md) for the complete step-by-step guide, including:
- Automated deployment via PowerShell
- Domain configuration
- SMS (OTP) setup
- Payment provider configuration (Fuiou, LCSW)
- SSL/HTTPS setup
- Backup scripts

**One-line deploy (inside RDP as Administrator):**
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/tanhabintehasan/health-coin/main/scripts/deploy-windows.ps1" -OutFile "C:\deploy-windows.ps1"
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
C:\deploy-windows.ps1
```

## Important Configuration Notes

### SMS (OTP Login)
- Sign up at [smsbao.com](https://www.smsbao.com)
- Configure credentials in **Admin Portal → Settings**
- Template must contain `[code]` placeholder

### Payments
- **Fuiou**: Configure `FUIOU_MERCHANT_NO` and `FUIOU_API_KEY` in `apps/api/.env`, then enable in Admin Settings
- **LCSW**: Configure `lcsw_merchant_no`, `lcsw_terminal_id`, `lcsw_access_token` in Admin Settings
- **Coin Payment**: Works immediately when `payment_coin_enabled` = `true`

### Webhook URLs
- Fuiou: `https://yourdomain.com/api/v1/webhooks/fuiou/payment`
- LCSW: `https://yourdomain.com/api/v1/webhooks/lcsw/payment`

## License

Proprietary — All rights reserved.
