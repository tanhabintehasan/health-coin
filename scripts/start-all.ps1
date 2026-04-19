# HealthCoin Platform — Windows Development Startup Script
# Runs: API Backend (NestJS) + Unified Web Frontend (Vite + React)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot

function Start-ServiceInWindow {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$Command
    )
    Write-Host "Starting $Name..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$WorkingDirectory`"; $Command" -WindowStyle Normal
}

# API Backend
Start-ServiceInWindow -Name "API Backend (NestJS)" -WorkingDirectory "$root\apps\api" -Command "npm run dev"

# Wait a moment for API to begin binding
Start-Sleep -Seconds 3

# Unified Web Frontend (contains Public, User, Merchant, Admin portals)
Start-ServiceInWindow -Name "Web Frontend (Vite)" -WorkingDirectory "$root\apps\web" -Command "npm run dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "All services are starting in new windows" -ForegroundColor Green
Write-Host "API        -> http://localhost:10000" -ForegroundColor Cyan
Write-Host "Web App    -> http://localhost:5173" -ForegroundColor Cyan
Write-Host "Swagger    -> http://localhost:10000/api/docs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Portals:" -ForegroundColor Yellow
Write-Host "  Public   -> http://localhost:5173/" -ForegroundColor White
Write-Host "  Login    -> http://localhost:5173/login" -ForegroundColor White
Write-Host "  User     -> http://localhost:5173/portal/user/home" -ForegroundColor White
Write-Host "  Merchant -> http://localhost:5173/portal/merchant/dashboard" -ForegroundColor White
Write-Host "  Admin    -> http://localhost:5173/portal/admin/dashboard" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
