# Production Environment Variables

## Render (Backend API)
Go to: Dashboard → health-coin Web Service → Environment

### Required (App won't start without these)
| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.xxxxxxxx:%5Bceo%40Muslim.1234%5D@aws-0-region.pooler.supabase.com:5432/postgres` | Must use Supabase **Session Pooler** URL, not direct `db.*` host. Password must be URL-encoded. |
| `JWT_SECRET` | *(your strong secret)* | Any secure random string |
| `JWT_REFRESH_SECRET` | *(different strong secret)* | Any secure random string |
| `JWT_EXPIRES_IN` | `2h` |  |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |  |
| `NODE_ENV` | `production` |  |
| `PORT` | `10000` |  |
| `APP_URL` | `https://health-coin.onrender.com` | Your Render backend URL |
| `CORS_ORIGINS` | `https://healthcoin.netlify.app,https://health-coin.netlify.app` | Comma-separated list of frontend domains |

### Payment & File Storage
| Variable | Value | Notes |
|---|---|---|
| `FUIOU_MERCHANT_NO` | *(your Fuiou merchant number)* |  |
| `FUIOU_API_KEY` | *(your Fuiou API key)* |  |
| `FUIOU_GATEWAY_URL` | `https://pay.fuiou.com` |  |
| `OSS_REGION` | `oss-cn-hangzhou` | Or your OSS region |
| `OSS_ACCESS_KEY_ID` | *(your Aliyun OSS key)* |  |
| `OSS_ACCESS_KEY_SECRET` | *(your Aliyun OSS secret)* |  |
| `OSS_BUCKET` | `healthcoin-files` |  |
| `OSS_ENDPOINT` | `https://oss-cn-hangzhou.aliyuncs.com` |  |

### Optional / Temporary
| Variable | Value | Notes |
|---|---|---|
| `DEMO_LOGIN_ENABLED` | `true` | Set to `false` when client review is over |
| `LCSW_ENCRYPTION_KEY` | *(64-character hex string)* | Recommended for LCSW credential encryption. Falls back to JWT_SECRET if omitted. |

### DELETE These (Dead / Removed Code)
- `REDIS_HOST`
- `REDIS_PASSWORD`
- `REDIS_PORT`
- `ALIYUN_ACCESS_KEY_ID`
- `ALIYUN_ACCESS_KEY_SECRET`
- `ALIYUN_SMS_SIGN_NAME`
- `ALIYUN_SMS_TEMPLATE_CODE`

---

## Netlify (Frontend Web App)
Go to: Site configuration → Environment variables

### Required
| Variable | Value | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `https://health-coin.onrender.com/api/v1` | Must point to your live Render backend, NOT localhost |

### Optional / Temporary
| Variable | Value | Notes |
|---|---|---|
| `VITE_DEMO_LOGIN_ENABLED` | `true` | Set to `false` when client review is over |

---

## Supabase (Database)
No env vars needed here, but after the backend boots:
1. Run `supabase/schema.sql` in SQL Editor
2. Run `supabase/seed.sql` in SQL Editor
3. (Optional) Insert real SMSbao credentials:
   ```sql
   INSERT INTO "system_configs" ("key", "value") VALUES
     ('smsbao_username', 'YOUR_USERNAME'),
     ('smsbao_password', 'YOUR_PASSWORD'),
     ('smsbao_template', '您的验证码是[code]，5分钟内有效。')
   ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value";
   ```
