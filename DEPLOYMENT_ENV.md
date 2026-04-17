# Complete Deployment Guide — Single Site

> **Goal:** Deploy the entire HealthCoin platform (API + Unified Web App) on **one Netlify site**, with Supabase as the database.

---

## Architecture Overview

| Component | Platform | Notes |
|-----------|----------|-------|
| **Unified Website** | Netlify (1 site) | `apps/web` serves Public Storefront + User Portal + Merchant Portal + Admin Dashboard |
| **API** | Netlify Functions (same site) | NestJS running via `@vendia/serverless-express` |
| **Database** | Supabase PostgreSQL | Session Pooler connection required |
| **File Storage** | Aliyun OSS | — |
| **SMS** | SMSbao | OTP login |
| **Payments** | Fuiou + LCSW (扫呗) | — |
| **Cron Jobs** | External (cron-job.org) | Pings protected endpoint hourly |

---

## 1. Prerequisites

Create accounts on:
- **Netlify** (https://netlify.com)
- **Supabase** (https://supabase.com)
- **SMSbao** (http://www.smsbao.com)
- **Fuiou** (https://pay.fuiou.com)
- **LCSW (扫呗)** — optional sub-merchant payment provider
- **Aliyun OSS** — for image/file uploads

Local tools:
- Node.js 22+
- Git

---

## 2. Supabase — Database Setup

### 2.1 Create Project
1. https://app.supabase.com → New Project
2. Set a strong database password and **save it**
3. Wait for provisioning

### 2.2 Connection String
1. Project Settings → Database → Connection String
2. Choose **Session Pooler** (NOT the direct `db.*` host)
3. Copy the URL
4. **URL-encode special characters in the password**:
   - `@` → `%40`
   - `[` → `%5B`
   - `]` → `%5D`
   - `#` → `%23`
   - etc.

Example:
```
postgresql://postgres.xxxxxxxx:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

### 2.3 Run Migration & Seeds
Open Supabase **SQL Editor** and run:

1. `apps/api/prisma/migrations/20250417000000_restructure/migration.sql`
2. `supabase/seed.sql`

Alternative (local CLI):
```bash
cd apps/api
npx prisma migrate deploy
npx prisma db seed
```

### 2.4 Insert SMSbao Credentials
Run this in SQL Editor:
```sql
INSERT INTO "system_configs" ("key", "value") VALUES
  ('smsbao_username', 'YOUR_SMSBAO_USERNAME'),
  ('smsbao_password', 'YOUR_SMSBAO_PASSWORD'),
  ('smsbao_template', '您的验证码是[code]，5分钟内有效。')
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value";
```

> **Important:** Without these 3 rows, SMS cannot send in production. In development mode, OTP codes are logged to the console instead.

---

## 3. Netlify — Single Site Deployment

### 3.1 Create Site
1. Netlify Dashboard → **Add new site** → Import from Git
2. Select your repository
3. **Base directory:** leave blank (repository root)
4. **Build command:** `npm install && npm run build`
5. **Publish directory:** `apps/web/dist`

Netlify will automatically detect functions in `apps/api/netlify/functions`.

### 3.2 Environment Variables
Site configuration → Environment variables:

#### Required (App will not start without these)
```
DATABASE_URL=postgresql://postgres.xxxxx:PASSWORD@pooler.supabase.com:5432/postgres
JWT_SECRET=your_very_long_random_secret_min_32_chars
JWT_REFRESH_SECRET=your_other_very_long_random_secret
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
APP_URL=https://multifunction-health-coin.netlify.app
CORS_ORIGINS=https://multifunction-health-coin.netlify.app
CRON_SECRET=a_random_string_to_protect_cron_endpoints
VITE_API_BASE_URL=/api/v1
VITE_DEMO_LOGIN_ENABLED=true
```

> **Note:** Because the API and Web app share the same domain, `CORS_ORIGINS` only needs the site's own URL. `VITE_API_BASE_URL` should also point to the same domain.

#### Payment & Storage
```
FUIOU_MERCHANT_NO=your_fuiou_merchant_no
FUIOU_API_KEY=your_fuiou_api_key
FUIOU_GATEWAY_URL=https://pay.fuiou.com
LCSW_ENCRYPTION_KEY=optional_64_char_hex
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your_key
OSS_ACCESS_KEY_SECRET=your_secret
OSS_BUCKET=healthcoin-files
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
```

#### Optional / Temporary
```
DEMO_LOGIN_ENABLED=true
```
Set to `false` when client review ends.

### 3.3 Deploy
Push to Git or trigger manual deploy.

The unified build command does two things:
1. `npm run build:api` — compiles NestJS to `apps/api/dist` and generates Prisma Client
2. `npm run build:web` — compiles the React SPA to `apps/web/dist`

### 3.4 Verify
Open these URLs in your browser:

| URL | Expected Result |
|-----|-----------------|
| `https://multifunction-health-coin.netlify.app/` | Public homepage with products |
| `https://multifunction-health-coin.netlify.app/shop` | Product listing |
| `https://multifunction-health-coin.netlify.app/login` | Login page with Demo Access buttons |
| `https://multifunction-health-coin.netlify.app/api/docs` | Swagger API documentation |

---

## 4. Demo Login — How It Works

### Backend
The endpoint `POST /auth/demo-login` is **still active**.
- It looks up pre-seeded demo users by role (`admin`, `merchant`, `user`).
- It returns real JWT tokens exactly like normal login.
- It is rate-limited to **3 attempts per minute** (to prevent abuse).
- It can be disabled by setting `DEMO_LOGIN_ENABLED=false` on the backend.

### Frontend
On the `/login` page, if `VITE_DEMO_LOGIN_ENABLED=true`, you will see four **"快速演示入口"** cards:
- 管理员后台 (Admin)
- 商户工作台 (Merchant)
- 会员首页 (User)
- 积分商城 (Browse without login)

Clicking a demo card first tries the real backend demo login. If the backend is unreachable or demo is disabled, it falls back to a **frontend-only mock mode** so you can still navigate and preview pages.

### Demo Users (Seeded)
| Role | Phone | Password/OTP | Portal Path |
|------|-------|--------------|-------------|
| Admin | `13800000001` | Use demo login button | `/portal/admin/dashboard` |
| Merchant | `13800000002` | Use demo login button | `/portal/merchant/dashboard` |
| User | `13800000004` | Use demo login button | `/portal/user/home` |

---

## 5. User Flow (Unified Frontend)

The `apps/web` frontend handles every role in one SPA:

### Public (no login required)
- `/` — Homepage
- `/shop` — Product listing with search & categories
- `/product/:id` — Product detail, add to cart
- `/about` — About us
- `/contact` — Contact us
- `/merchant-join` — Merchant application info

### Authentication
- `/login` — Phone + OTP login (with Demo Access)
- `/register` — Same as login (auto-creates account)

### User Portal (after login)
- `/portal/user/home` — User dashboard
- `/portal/user/cart` — Shopping cart
- `/portal/user/orders` — Order history
- `/portal/user/order/:id` — Order detail & payment
- `/portal/user/wallet` — Balances & transactions
- `/portal/user/referral` — Referral code & tree
- `/portal/user/profile` — Profile settings
- `/portal/user/health` — Health records upload

### Merchant Portal (merchant role)
- `/portal/merchant/dashboard` — Merchant stats
- `/portal/merchant/products` — Product management
- `/portal/merchant/orders` — Order fulfillment
- `/portal/merchant/redemption` — Scan & confirm redemption
- `/portal/merchant/apply` — Merchant application form

### Admin Portal (admin role)
- `/portal/admin/dashboard` — Platform statistics (including the 5 new stats)
- `/portal/admin/users` — Member management
- `/portal/admin/merchants` — Merchant approval
- `/portal/admin/products` — Product review
- `/portal/admin/orders` — Order management
- `/portal/admin/withdrawals` — Payout approval
- `/portal/admin/settings` — System configuration (SMSbao, payment toggles, coin rates)

---

## 6. Cron Job Setup

Because the API runs serverlessly, NestJS `@Cron` does not stay alive.

### Free Option: cron-job.org
1. Register at https://cron-job.org
2. Create a job:
   - **URL:** `https://multifunction-health-coin.netlify.app/api/v1/admin/cron/membership-auto-upgrade`
   - **Method:** `POST`
   - **Header:** `x-cron-secret: YOUR_CRON_SECRET`
   - **Schedule:** Every 60 minutes
3. Enable the job

### Test the Endpoint
```bash
curl -X POST https://multifunction-health-coin.netlify.app/api/v1/admin/cron/membership-auto-upgrade \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```
Expected response:
```json
{"success":true,"message":"Membership auto-upgrade executed"}
```

---

## 7. Payment Webhooks

Configure these URLs in your payment provider dashboards:

### Fuiou
```
https://multifunction-health-coin.netlify.app/api/v1/webhooks/fuiou/payment
```

### LCSW (扫呗)
```
https://multifunction-health-coin.netlify.app/api/v1/webhooks/lcsw/payment
```

---

## 8. SMS Troubleshooting

### "短信发送失败，请稍后重试"
This means the SMS gateway threw an error. Check Netlify Function logs for the exact SMSbao error code.

Common SMSbao codes:
| Code | Meaning | Fix |
|------|---------|-----|
| `-1` | No such user account | Check `smsbao_username` |
| `-2` | API key incorrect | Check `smsbao_password` |
| `-3` | Insufficient SMS balance | Top up at smsbao.com |
| `30` | Wrong password | Check `smsbao_password` |
| `40` | Account does not exist | Register at smsbao.com |
| `41` | Balance insufficient | Top up balance |
| `50` | Sensitive words | Change template wording |

### Testing SMS without spending credits
In development (`NODE_ENV=development`), the API logs the OTP to the console instead of calling SMSbao. You can read the code from the terminal or Netlify dev logs.

---

## 9. Post-Deploy Verification Checklist

- [ ] Homepage (`/`) loads with navigation and products
- [ ] `/shop` shows product listing without asking for login
- [ ] `/login` shows demo access buttons
- [ ] Demo login (Admin / Merchant / User) redirects to correct portal
- [ ] Phone OTP login works (SMS arrives in production)
- [ ] Cart add increments quantity correctly
- [ ] Order checkout creates unique order number
- [ ] Coin payment completes and credits rewards
- [ ] Fuiou/LCSW payment initiates and webhook marks order PAID
- [ ] Merchant can scan redemption code and confirm
- [ ] Admin dashboard displays 11 statistics
- [ ] Cron job returns `{"success":true}`
- [ ] WeChat Pay / Alipay options are **not visible** in checkout

---

## 10. What Was Removed & Why

To keep the codebase clean and unified, the following were removed:
- `backend/`, `frontend/`, `admin/` — stale root-level build artifacts
- `apps/admin-web/`, `apps/merchant-web/`, `apps/user-web/` — redundant SPAs (all functionality already exists inside `apps/web`)
- `docker-compose.yml`, `LOCAL_DEV_SETUP.md`, `start.sh` — outdated local-dev helpers
- WeChat Pay & Alipay stubs — client chose Fuiou + LCSW only
- Redis module — no longer used after Bull queue removal

The **unified frontend** (`apps/web`) already contains every page: public storefront, user dashboard, merchant tools, and admin panel.
