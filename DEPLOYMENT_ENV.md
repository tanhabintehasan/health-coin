# Complete Deployment Guide

> **Goal:** Deploy the HealthCoin platform with zero Render dependency.  
> **Stack:** Netlify Functions (API) + Netlify (Frontends) + Supabase (PostgreSQL)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Supabase — Database Setup](#2-supabase--database-setup)
3. [Netlify — API Deployment](#3-netlify--api-deployment)
4. [Netlify — Frontend Deployments](#4-netlify--frontend-deployments)
5. [Cron Job Setup](#5-cron-job-setup)
6. [Payment Webhook Configuration](#6-payment-webhook-configuration)
7. [SMS Configuration](#7-sms-configuration)
8. [Post-Deploy Verification](#8-post-deploy-verification)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

You will need accounts on:
- **Netlify** (https://netlify.com) — for API + 4 frontends
- **Supabase** (https://supabase.com) — for PostgreSQL
- **SMSbao** (http://www.smsbao.com) — for OTP SMS
- **Fuiou** (https://pay.fuiou.com) — for payments
- **LCSW (扫呗)** — optional, for sub-merchant payments
- **Aliyun OSS** — for file uploads

Recommended tools installed locally:
- Node.js 22+
- Git

---

## 2. Supabase — Database Setup

### 2.1 Create Project
1. Go to https://app.supabase.com → New Project
2. Choose a strong database password and **save it**
3. Wait for provisioning to finish

### 2.2 Get Connection String
1. Project Settings → Database → Connection String
2. Select **Session Pooler** (NOT direct connection)
3. Copy the `postgresql://...` URL
4. **URL-encode the password** if it contains special characters (e.g. `@` → `%40`, `[` → `%5B`, `]` → `%5D`)

Example:
```
postgresql://postgres.xxxxxxxx:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

### 2.3 Apply Schema & Migration
1. Open Supabase SQL Editor
2. Run the contents of `apps/api/prisma/migrations/20250417000000_restructure/migration.sql`
3. Then run `supabase/seed.sql`

Alternative (if you have database access locally):
```bash
cd apps/api
npx prisma migrate deploy
npx prisma db seed
```

### 2.4 Insert SMSbao Credentials
In Supabase SQL Editor, run:
```sql
INSERT INTO "system_configs" ("key", "value") VALUES
  ('smsbao_username', 'YOUR_SMSBAO_USERNAME'),
  ('smsbao_password', 'YOUR_SMSBAO_PASSWORD'),
  ('smsbao_template', '您的验证码是[code]，5分钟内有效。')
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value";
```

---

## 3. Netlify — API Deployment

### 3.1 Create Site
1. Netlify Dashboard → **Add new site** → Import an existing project
2. Connect your Git provider and select the repository
3. **Base directory:** `apps/api`
4. **Build command:** `npm run build`
5. **Publish directory:** `dist`

### 3.2 Environment Variables
Go to Site configuration → Environment variables, and add:

| Variable | Example Value | Required |
|----------|---------------|----------|
| `DATABASE_URL` | `postgresql://postgres.xxxxx:PASSWORD@pooler.supabase.com:5432/postgres` | ✅ |
| `JWT_SECRET` | `a_very_long_random_string_min_32_chars` | ✅ |
| `JWT_REFRESH_SECRET` | `a_different_very_long_random_string` | ✅ |
| `JWT_EXPIRES_IN` | `2h` | ✅ |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | ✅ |
| `NODE_ENV` | `production` | ✅ |
| `APP_URL` | `https://healthcoin-api.netlify.app` | ✅ |
| `CORS_ORIGINS` | `https://healthcoin-web.netlify.app,https://healthcoin-user.netlify.app,https://healthcoin-admin.netlify.app,https://healthcoin-merchant.netlify.app` | ✅ |
| `CRON_SECRET` | `another_random_string_for_cron_protection` | ✅ |
| `DEMO_LOGIN_ENABLED` | `false` | optional |
| `FUIOU_MERCHANT_NO` | `your_fuiou_merchant_no` | for payments |
| `FUIOU_API_KEY` | `your_fuiou_api_key` | for payments |
| `FUIOU_GATEWAY_URL` | `https://pay.fuiou.com` | for payments |
| `LCSW_ENCRYPTION_KEY` | `64_char_hex_string` | optional |
| `OSS_REGION` | `oss-cn-hangzhou` | for file uploads |
| `OSS_ACCESS_KEY_ID` | `your_oss_key` | for file uploads |
| `OSS_ACCESS_KEY_SECRET` | `your_oss_secret` | for file uploads |
| `OSS_BUCKET` | `healthcoin-files` | for file uploads |
| `OSS_ENDPOINT` | `https://oss-cn-hangzhou.aliyuncs.com` | for file uploads |

### 3.3 Deploy
Push to Git or trigger a manual deploy. The build will:
1. Generate Prisma Client
2. Compile NestJS to `dist/`
3. Package the Netlify Function from `netlify/functions/api.ts`

### 3.4 Verify API Health
Open in browser:
```
https://YOUR_API_SITE.netlify.app/api/v1/health
```
*(If you don't have a health endpoint, test with `/api/v1/auth/otp/send` or Swagger at `/api/docs`)*

---

## 4. Netlify — Frontend Deployments

Create **4 separate Netlify sites**. Each site uses its own `netlify.toml` inside the app folder.

### 4.1 Public Web (`apps/web`)
- **Base directory:** `apps/web`
- **Build command:** `npm install && npm run build`
- **Publish directory:** `dist`
- **Env var:** `VITE_API_BASE_URL=https://YOUR_API_SITE.netlify.app/api/v1`

### 4.2 User Web (`apps/user-web`)
- **Base directory:** `apps/user-web`
- **Build command:** `npm install && npm run build`
- **Publish directory:** `dist`
- **Env var:** `VITE_API_BASE_URL=https://YOUR_API_SITE.netlify.app/api/v1`

### 4.3 Admin Web (`apps/admin-web`)
- **Base directory:** `apps/admin-web`
- **Build command:** `npm install && npm run build`
- **Publish directory:** `dist`
- **Env var:** `VITE_API_BASE_URL=https://YOUR_API_SITE.netlify.app/api/v1`

### 4.4 Merchant Web (`apps/merchant-web`)
- **Base directory:** `apps/merchant-web`
- **Build command:** `npm install && npm run build`
- **Publish directory:** `dist`
- **Env var:** `VITE_API_BASE_URL=https://YOUR_API_SITE.netlify.app/api/v1`

### 4.5 Update CORS_ORIGINS
After all 4 frontend sites are deployed, copy their exact `.netlify.app` URLs and update the `CORS_ORIGINS` environment variable on the **API site**. Then trigger a rebuild of the API.

---

## 5. Cron Job Setup

Because the API is serverless, the internal `@Cron` decorator does not run on a schedule. You must call the cron endpoint externally.

### Recommended: cron-job.org (Free)
1. Register at https://cron-job.org
2. Create a new cron job:
   - **Title:** HealthCoin Membership Auto-Upgrade
   - **URL:** `https://YOUR_API_SITE.netlify.app/api/v1/admin/cron/membership-auto-upgrade`
   - **Method:** `POST`
   - **Header:** `x-cron-secret` = your `CRON_SECRET` env value
   - **Schedule:** Every 60 minutes
3. Save and enable

### Alternative: Supabase pg_cron (paid plans)
If your Supabase plan supports `pg_cron`, you can schedule a database function to call the endpoint.

---

## 6. Payment Webhook Configuration

### Fuiou
In your Fuiou merchant dashboard, set the **asynchronous notification URL** to:
```
https://YOUR_API_SITE.netlify.app/api/v1/webhooks/fuiou/payment
```

### LCSW (扫呗)
In your LCSW institution/sub-merchant settings, set the payment callback URL to:
```
https://YOUR_API_SITE.netlify.app/api/v1/webhooks/lcsw/payment
```

---

## 7. SMS Configuration

### SMSbao Setup
1. Register at http://www.smsbao.com and top up balance
2. Note your **username** and **password**
3. Create a template using `[code]` as the placeholder, e.g.:
   ```
   您的验证码是[code]，5分钟内有效。
   ```
4. Insert these into Supabase `system_configs` (see Section 2.4)

### How SMS Sending Works
- The API reads `smsbao_username`, `smsbao_password`, and `smsbao_template` from the `system_configs` table dynamically.
- In **development** (`NODE_ENV !== 'production'`), SMS is **not sent**; the code is logged to the console instead.
- In **production**, the API calls SMSbao HTTP gateway directly.
- If SMSbao fails (wrong credentials, no balance, network error), the API **does NOT leak the OTP code** to the client. It returns a generic error message: `短信发送失败，请稍后重试`.
- The SMS provider is no longer hardcoded to `'smsbao'` via a broken ternary; it reads cleanly from `map.sms_provider ?? 'smsbao'`.

---

## 8. Post-Deploy Verification

Run through this checklist after every deploy:

- [ ] API Swagger docs load at `https://YOUR_API_SITE.netlify.app/api/docs`
- [ ] Public web can browse products
- [ ] User can register/login with phone + OTP
- [ ] SMS OTP arrives on real phone number (production only)
- [ ] Cart "Add to Cart" increments quantity on duplicate clicks
- [ ] Order checkout creates a unique order number
- [ ] Coin payment (Health/Mutual/Universal) completes successfully
- [ ] Fuiou/LCSW cash payment initiates and webhook marks order PAID
- [ ] Coin rewards are credited after payment
- [ ] Redemption code is a 10-character alphanumeric string (not 8-digit number)
- [ ] Merchant can scan and confirm redemption
- [ ] Admin dashboard shows 11 statistics including the 5 new ones
- [ ] Membership auto-upgrade cron returns `{"success":true}` when triggered manually
- [ ] Refresh token is rotated (old one invalidated) on `/auth/token/refresh`
- [ ] WeChat Pay and Alipay options are **not visible** anywhere in checkout

---

## 9. Troubleshooting

### "Cannot find module '@prisma/client'" during API build
- Make sure `npx prisma generate` runs before `nest build`. The `apps/api/package.json` build script already does this.

### "Missing required environment variables" on API cold start
- Check that `DATABASE_URL`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` are set in the Netlify site settings.

### CORS errors on frontend
- Verify `CORS_ORIGINS` includes the exact frontend domain (including `https://`).
- After changing `CORS_ORIGINS`, redeploy the API.

### Cron job returns 403 Forbidden
- Make sure the `x-cron-secret` header matches the `CRON_SECRET` env variable exactly.

### SMS not sending in production
- Check Supabase `system_configs` table for `smsbao_username`, `smsbao_password`, and `smsbao_template`.
- Check Netlify function logs for SMSbao error codes.

### Payment webhooks return 500
- Verify `APP_URL` matches your actual Netlify API domain.
- Check that `FUIOU_API_KEY` is correct for signature verification.
