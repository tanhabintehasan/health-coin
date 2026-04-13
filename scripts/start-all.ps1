# HealthCoin Platform — Windows Startup Script (No Docker)
# Runs: API, User Web, Admin Web, Merchant Web

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

# Frontends
Start-ServiceInWindow -Name "User Web (Vite)" -WorkingDirectory "$root\apps\user-web" -Command "npm run dev"
Start-ServiceInWindow -Name "Admin Web (Vite)" -WorkingDirectory "$root\apps\admin-web" -Command "npm run dev"
Start-ServiceInWindow -Name "Merchant Web (Vite)" -WorkingDirectory "$root\apps\merchant-web" -Command "npm run dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "All services are starting in new windows" -ForegroundColor Green
Write-Host "API        -> http://localhost:3000" -ForegroundColor Cyan
Write-Host "User Web   -> http://localhost:5173" -ForegroundColor Cyan
Write-Host "Admin Web  -> http://localhost:5174" -ForegroundColor Cyan
Write-Host "Merchant   -> http://localhost:5175" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
