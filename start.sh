#!/bin/bash
# HealthCoin Platform — start all services

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting HealthCoin Platform..."
echo ""

# API
osascript -e "tell app \"Terminal\" to do script \"cd $ROOT/apps/api && npm run dev\"" 2>/dev/null || \
  gnome-terminal -- bash -c "cd '$ROOT/apps/api' && npm run dev; exec bash" 2>/dev/null || \
  xterm -e "cd '$ROOT/apps/api' && npm run dev" 2>/dev/null || \
  (cd "$ROOT/apps/api" && npm run dev &)

# User Web
osascript -e "tell app \"Terminal\" to do script \"cd $ROOT/apps/user-web && npm run dev\"" 2>/dev/null || \
  gnome-terminal -- bash -c "cd '$ROOT/apps/user-web' && npm run dev; exec bash" 2>/dev/null || \
  xterm -e "cd '$ROOT/apps/user-web' && npm run dev" 2>/dev/null || \
  (cd "$ROOT/apps/user-web" && npm run dev &)

# Admin Web
osascript -e "tell app \"Terminal\" to do script \"cd $ROOT/apps/admin-web && npm run dev\"" 2>/dev/null || \
  gnome-terminal -- bash -c "cd '$ROOT/apps/admin-web' && npm run dev; exec bash" 2>/dev/null || \
  xterm -e "cd '$ROOT/apps/admin-web' && npm run dev" 2>/dev/null || \
  (cd "$ROOT/apps/admin-web" && npm run dev &)

# Merchant Web
osascript -e "tell app \"Terminal\" to do script \"cd $ROOT/apps/merchant-web && npm run dev\"" 2>/dev/null || \
  gnome-terminal -- bash -c "cd '$ROOT/apps/merchant-web' && npm run dev; exec bash" 2>/dev/null || \
  xterm -e "cd '$ROOT/apps/merchant-web' && npm run dev" 2>/dev/null || \
  (cd "$ROOT/apps/merchant-web" && npm run dev &)

echo "Opened terminals for:"
echo "  API          → http://localhost:10000"
echo "  User Web     → http://localhost:5173"
echo "  Admin Web    → http://localhost:5174 (or check terminal for port)"
echo "  Merchant Web → http://localhost:5175 (or check terminal for port)"
