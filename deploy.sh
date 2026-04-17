#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# HealthCoin Platform — One-Click Alibaba Cloud ECS Deployment Script
# =============================================================================
# Run this on a fresh Ubuntu 22.04 server as root:
#   curl -fsSL https://raw.githubusercontent.com/tanhabintehasan/health-coin/main/deploy.sh | bash
# Or copy deploy.sh to the server and run:
#   chmod +x deploy.sh && ./deploy.sh
# =============================================================================

APP_DIR="/var/www/healthcoin"
REPO_URL="https://github.com/tanhabintehasan/health-coin.git"
BRANCH="main"
API_PORT=10000
NGINX_CONF="/etc/nginx/sites-available/healthcoin"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARN:${NC} $1"; }
error() { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"; exit 1; }
step() { echo -e "\n${BLUE}══════════════════════════════════════════════════════════════${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"; }

# =============================================================================
# 0. Check root
# =============================================================================
if [ "$EUID" -ne 0 ]; then
  error "Please run this script as root (use sudo)"
fi

# =============================================================================
# 1. Collect configuration
# =============================================================================
step "Step 1/10 — Configuration"

read -rp "Enter your server's public IP or domain (e.g., 47.242.123.45 or coin.example.com): " SERVER_HOST
if [ -z "$SERVER_HOST" ]; then
  error "Server host is required"
fi

read -rp "Enter your Supabase DATABASE_URL: " DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  error "DATABASE_URL is required"
fi

read -rp "Enter JWT_SECRET (min 32 random chars): " JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
  error "JWT_SECRET is required"
fi

read -rp "Enter JWT_REFRESH_SECRET (different from JWT_SECRET): " JWT_REFRESH_SECRET
if [ -z "$JWT_REFRESH_SECRET" ]; then
  error "JWT_REFRESH_SECRET is required"
fi

read -rp "Enter CRON_SECRET (random string for cron protection): " CRON_SECRET
if [ -z "$CRON_SECRET" ]; then
  error "CRON_SECRET is required"
fi

read -rp "Enter FUIOU_MERCHANT_NO (or press Enter to skip): " FUIOU_MERCHANT_NO
read -rp "Enter FUIOU_API_KEY (or press Enter to skip): " FUIOU_API_KEY
read -rp "Enter FUIOU_GATEWAY_URL [https://pay.fuiou.com]: " FUIOU_GATEWAY_URL
FUIOU_GATEWAY_URL=${FUIOU_GATEWAY_URL:-https://pay.fuiou.com}

read -rp "Enter OSS_ACCESS_KEY_ID (or press Enter to skip): " OSS_ACCESS_KEY_ID
read -rp "Enter OSS_ACCESS_KEY_SECRET (or press Enter to skip): " OSS_ACCESS_KEY_SECRET
read -rp "Enter OSS_BUCKET (or press Enter to skip): " OSS_BUCKET
read -rp "Enter OSS_REGION [oss-cn-hangzhou]: " OSS_REGION
OSS_REGION=${OSS_REGION:-oss-cn-hangzhou}
read -rp "Enter OSS_ENDPOINT [https://oss-cn-hangzhou.aliyuncs.com]: " OSS_ENDPOINT
OSS_ENDPOINT=${OSS_ENDPOINT:-https://oss-cn-hangzhou.aliyuncs.com}

read -rp "Do you want to set up SSL with Let's Encrypt? (y/n): " SETUP_SSL
if [[ "$SETUP_SSL" =~ ^[Yy]$ ]]; then
  read -rp "Enter your email for SSL certificate: " SSL_EMAIL
  if [ -z "$SSL_EMAIL" ]; then
    error "Email is required for SSL setup"
  fi
fi

APP_URL="http://${SERVER_HOST}"
CORS_ORIGINS="http://${SERVER_HOST},http://localhost:5173"

if [[ "$SERVER_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  IS_IP=true
  warn "You entered an IP address. SSL (HTTPS) requires a domain name. SSL setup will be skipped."
  SETUP_SSL="n"
else
  IS_IP=false
  APP_URL="https://${SERVER_HOST}"
  CORS_ORIGINS="https://${SERVER_HOST},http://localhost:5173"
fi

log "App URL will be: $APP_URL"
log "CORS Origins: $CORS_ORIGINS"

# =============================================================================
# 2. System update & install packages
# =============================================================================
step "Step 2/10 — Installing System Dependencies"

apt-get update -y
apt-get upgrade -y

# Install essential packages
apt-get install -y curl wget git build-essential nginx ufw

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

log "Node.js version: $(node -v)"
log "npm version: $(npm -v)"

# Install PM2 globally
npm install -g pm2

log "PM2 version: $(pm2 -v)"

# =============================================================================
# 3. Firewall setup
# =============================================================================
step "Step 3/10 — Firewall Setup"

ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
log "Firewall configured. Ports 22, 80, 443 are open."

# =============================================================================
# 4. Clone repository
# =============================================================================
step "Step 4/10 — Cloning Repository"

if [ -d "$APP_DIR" ]; then
  warn "Directory $APP_DIR already exists. Removing..."
  rm -rf "$APP_DIR"
fi

mkdir -p "$APP_DIR"
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"
log "Repository cloned to $APP_DIR"

# =============================================================================
# 5. Create environment files
# =============================================================================
step "Step 5/10 — Creating Environment Files"

# API .env
cat > apps/api/.env <<EOF
# Database
DATABASE_URL=${DATABASE_URL}

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d

# App
NODE_ENV=production
APP_URL=${APP_URL}
CORS_ORIGINS=${CORS_ORIGINS}
CRON_SECRET=${CRON_SECRET}
DEMO_LOGIN_ENABLED=true
PORT=${API_PORT}

# Payment
FUIOU_MERCHANT_NO=${FUIOU_MERCHANT_NO:-}
FUIOU_API_KEY=${FUIOU_API_KEY:-}
FUIOU_GATEWAY_URL=${FUIOU_GATEWAY_URL}

# Aliyun OSS
OSS_REGION=${OSS_REGION}
OSS_ACCESS_KEY_ID=${OSS_ACCESS_KEY_ID:-}
OSS_ACCESS_KEY_SECRET=${OSS_ACCESS_KEY_SECRET:-}
OSS_BUCKET=${OSS_BUCKET:-}
OSS_ENDPOINT=${OSS_ENDPOINT}
EOF

chmod 600 apps/api/.env
log "Created apps/api/.env"

# Web build env (for build-time injection)
cat > apps/web/.env.production <<EOF
VITE_API_BASE_URL=/api/v1
VITE_DEMO_LOGIN_ENABLED=true
EOF
log "Created apps/web/.env.production"

# =============================================================================
# 6. Install dependencies, generate Prisma, build
# =============================================================================
step "Step 6/10 — Installing Dependencies & Building"

npm install

cd apps/api
npx prisma generate
npx prisma migrate deploy
log "Prisma client generated and migrations applied"

cd "$APP_DIR"

log "Building API..."
npm run build:api

log "Building Web Frontend..."
npm run build:web

log "Build completed successfully"

# =============================================================================
# 7. Configure Nginx
# =============================================================================
step "Step 7/10 — Configuring Nginx"

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Create our site config
cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name ${SERVER_HOST};

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API routes → NestJS backend
    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Increase timeout for slow DB queries
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Swagger docs
    location /api/docs {
        proxy_pass http://127.0.0.1:${API_PORT}/api/docs;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static frontend files
    location / {
        root ${APP_DIR}/apps/web/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;
}
EOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/healthcoin

nginx -t || error "Nginx configuration test failed"
systemctl restart nginx
systemctl enable nginx
log "Nginx configured and restarted"

# =============================================================================
# 8. Start API with PM2
# =============================================================================
step "Step 8/10 — Starting API with PM2"

cd "$APP_DIR/apps/api"

# Stop any existing PM2 process
pm2 delete healthcoin-api 2>/dev/null || true

# Start the API
pm2 start dist/src/main.js --name healthcoin-api \
  --restart-delay 3000 \
  --max-restarts 5 \
  --min-uptime 10s \
  --env NODE_ENV=production

# Save PM2 config
pm2 save

# Setup PM2 startup script
PM2_STARTUP_CMD=$(pm2 startup systemd 2>/dev/null | grep "sudo env PATH" || true)
if [ -n "$PM2_STARTUP_CMD" ]; then
  eval "$PM2_STARTUP_CMD" || warn "PM2 startup script may need manual setup"
else
  warn "Could not auto-detect PM2 startup command. Run 'pm2 startup' manually if needed."
fi

log "API started on port $API_PORT"
pm2 status healthcoin-api

# =============================================================================
# 9. Setup Cron Jobs
# =============================================================================
step "Step 9/10 — Setting Up Cron Jobs"

CRON_LINE="0 * * * * curl -s -X POST http://127.0.0.1:${API_PORT}/api/v1/admin/cron/membership-auto-upgrade -H \"x-cron-secret: ${CRON_SECRET}\" > /dev/null 2>&1"

# Remove old cron lines for this job if they exist
(crontab -l 2>/dev/null | grep -v "membership-auto-upgrade" || true) > /tmp/crontab.tmp

# Add new cron line
echo "$CRON_LINE" >> /tmp/crontab.tmp
crontab /tmp/crontab.tmp
rm -f /tmp/crontab.tmp

log "Cron job added — membership auto-upgrade runs every hour"

# =============================================================================
# 10. Optional SSL Setup
# =============================================================================
step "Step 10/10 — SSL Setup (Optional)"

if [[ "$SETUP_SSL" =~ ^[Yy]$ ]] && [ "$IS_IP" = false ]; then
  log "Installing Certbot..."
  apt-get install -y certbot python3-certbot-nginx

  log "Obtaining SSL certificate for $SERVER_HOST..."
  certbot --nginx -d "$SERVER_HOST" --non-interactive --agree-tos --email "$SSL_EMAIL" || warn "SSL setup failed. You can run it manually later."

  # Auto-renewal is already set up by certbot
  systemctl enable certbot.timer
  log "SSL certificate installed. Auto-renewal is enabled."
else
  if [ "$IS_IP" = true ]; then
    warn "SSL skipped — IP addresses cannot use Let's Encrypt. Use a domain name for HTTPS."
  else
    warn "SSL skipped. You can set it up later with: certbot --nginx -d $SERVER_HOST"
  fi
fi

# =============================================================================
# 11. Health Check
# =============================================================================
step "Final Health Check"

sleep 3

# Check API
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${API_PORT}/api/v1/products?limit=8" || echo "000")
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "401" ]; then
  log "✅ API is responding (HTTP $HTTP_STATUS)"
else
  warn "⚠️  API returned HTTP $HTTP_STATUS. Check logs with: pm2 logs healthcoin-api"
fi

# Check Nginx
NGINX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1/api/v1/products?limit=8" || echo "000")
if [ "$NGINX_STATUS" = "200" ] || [ "$NGINX_STATUS" = "401" ]; then
  log "✅ Nginx reverse proxy is working (HTTP $NGINX_STATUS)"
else
  warn "⚠️  Nginx returned HTTP $NGINX_STATUS. Check: nginx -t && systemctl status nginx"
fi

# Check frontend
FRONT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1/" || echo "000")
if [ "$FRONT_STATUS" = "200" ]; then
  log "✅ Frontend is serving (HTTP $FRONT_STATUS)"
else
  warn "⚠️  Frontend returned HTTP $FRONT_STATUS"
fi

# =============================================================================
# Done
# =============================================================================
step "🎉 Deployment Complete!"

cat <<BANNER

┌─────────────────────────────────────────────────────────────────────┐
│                    HEALTHCOIN DEPLOYED SUCCESSFULLY                 │
├─────────────────────────────────────────────────────────────────────┤
│  🌐  Public URL:    ${APP_URL}                                      │
│  📖  API Docs:      ${APP_URL}/api/docs                             │
│  🔑  Admin Portal:  ${APP_URL}/login                                │
│                                                                    │
│  🖥️  Server Files:  ${APP_DIR}                                      │
│                                                                    │
│  📊  Check API status:  pm2 status                                  │
│  📋  View API logs:     pm2 logs healthcoin-api                     │
│  🔄  Restart API:       pm2 restart healthcoin-api                  │
│                                                                    │
│  🌐  Nginx config:     ${NGINX_CONF}                                │
│  🔄  Reload Nginx:     systemctl reload nginx                       │
│                                                                    │
│  🗄️  Database:        Connected to your Supabase project            │
│                                                                    │
│  🔐  Environment:     apps/api/.env                                 │
│                                                                    │
│  ⏰  Cron job:        Membership auto-upgrade every hour            │
└─────────────────────────────────────────────────────────────────────┘

Next steps:
  1. Visit ${APP_URL}/api/docs to verify Swagger loads
  2. Visit ${APP_URL}/login to test demo login
  3. Configure SMSbao credentials in the admin settings
  4. Configure Fuiou payment credentials if using payments
  5. Set up cron-job.org to ping your cron endpoint externally
     URL: ${APP_URL}/api/v1/admin/cron/membership-auto-upgrade
     Header: x-cron-secret: ${CRON_SECRET}

If anything is broken, check the logs:
  pm2 logs healthcoin-api --lines 100
  journalctl -u nginx -n 50 --no-pager

BANNER

exit 0
