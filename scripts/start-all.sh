#!/usr/bin/env bash
# HealthCoin Platform — macOS/Linux Development Startup Script
# Runs: API Backend (NestJS) + Unified Web Frontend (Vite + React)

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Starting HealthCoin services..."

# API Backend
echo "[1/2] Starting API Backend on port 10000..."
osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT/apps/api' && npm run dev\"" 2>/dev/null || \
  gnome-terminal -- bash -c "cd '$ROOT/apps/api' && npm run dev; exec bash" 2>/dev/null || \
  xterm -e "cd '$ROOT/apps/api' && npm run dev" 2>/dev/null || \
  (cd "$ROOT/apps/api" && npm run dev &)

sleep 3

# Unified Web Frontend
echo "[2/2] Starting Web Frontend on port 5173..."
osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT/apps/web' && npm run dev\"" 2>/dev/null || \
  gnome-terminal -- bash -c "cd '$ROOT/apps/web' && npm run dev; exec bash" 2>/dev/null || \
  xterm -e "cd '$ROOT/apps/web' && npm run dev" 2>/dev/null || \
  (cd "$ROOT/apps/web" && npm run dev &)

echo ""
echo "========================================"
echo "All services are starting"
echo "API        -> http://localhost:10000"
echo "Web App    -> http://localhost:5173"
echo "Swagger    -> http://localhost:10000/api/docs"
echo "========================================"
echo ""
echo "Portals:"
echo "  Public   -> http://localhost:5173/"
echo "  Login    -> http://localhost:5173/login"
echo "  User     -> http://localhost:5173/portal/user/home"
echo "  Merchant -> http://localhost:5173/portal/merchant/dashboard"
echo "  Admin    -> http://localhost:5173/portal/admin/dashboard"
echo "========================================"
