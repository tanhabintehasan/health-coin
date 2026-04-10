#!/bin/bash
# HealthCoin Platform — start all services

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting HealthCoin Platform..."
echo ""

# API
osascript -e "tell app \"Terminal\" to do script \"cd $ROOT/apps/api && npm run dev\""

# Admin Web
osascript -e "tell app \"Terminal\" to do script \"cd $ROOT/apps/admin-web && npm run dev\""

# Merchant Web
osascript -e "tell app \"Terminal\" to do script \"cd $ROOT/apps/merchant-web && npm run dev\""

# Miniprogram
osascript -e "tell app \"Terminal\" to do script \"cd $ROOT/apps/miniprogram && npm run dev:weapp\""

echo "Opened 4 terminals:"
echo "  API          → http://localhost:3000"
echo "  Admin Web    → http://localhost:5173 (or check terminal for port)"
echo "  Merchant Web → http://localhost:5174 (or check terminal for port)"
echo "  Miniprogram  → open dist/weapp in WeChat DevTools"
