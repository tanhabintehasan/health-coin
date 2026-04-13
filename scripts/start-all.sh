#!/usr/bin/env bash
# HealthCoin Platform — macOS/Linux Startup Script (No Docker)
# Runs: API, User Web, Admin Web, Merchant Web

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Starting HealthCoin services..."

# API Backend
echo "[1/4] Starting API Backend on port 3000..."
osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT/apps/api' && npm run dev\"" 2>/dev/null || \
  gnome-terminal -- bash -c "cd '$ROOT/apps/api' && npm run dev; exec bash" 2>/dev/null || \
  xterm -e "cd '$ROOT/apps/api' && npm run dev" 2>/dev/null || \
  (cd "$ROOT/apps/api" && npm run dev &)

sleep 3

# User Web
echo "[2/4] Starting User Web on port 5173..."
osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT/apps/user-web' && npm run dev\"" 2>/dev/null || \
  gnome-terminal -- bash -c "cd '$ROOT/apps/user-web' && npm run dev; exec bash" 2>/dev/null || \
  xterm -e "cd '$ROOT/apps/user-web' && npm run dev" 2>/dev/null || \
  (cd "$ROOT/apps/user-web" && npm run dev &)

# Admin Web
echo "[3/4] Starting Admin Web on port 5174..."
osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT/apps/admin-web' && npm run dev\"" 2>/dev/null || \
  gnome-terminal -- bash -c "cd '$ROOT/apps/admin-web' && npm run dev; exec bash" 2>/dev/null || \
  xterm -e "cd '$ROOT/apps/admin-web' && npm run dev" 2>/dev/null || \
  (cd "$ROOT/apps/admin-web" && npm run dev &)

# Merchant Web
echo "[4/4] Starting Merchant Web on port 5175..."
osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT/apps/merchant-web' && npm run dev\"" 2>/dev/null || \
  gnome-terminal -- bash -c "cd '$ROOT/apps/merchant-web' && npm run dev; exec bash" 2>/dev/null || \
  xterm -e "cd '$ROOT/apps/merchant-web' && npm run dev" 2>/dev/null || \
  (cd "$ROOT/apps/merchant-web" && npm run dev &)

echo ""
echo "========================================"
echo "All services are starting"
echo "API        -> http://localhost:3000"
echo "User Web   -> http://localhost:5173"
echo "Admin Web  -> http://localhost:5174"
echo "Merchant   -> http://localhost:5175"
echo "========================================"
