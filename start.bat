@echo off
setlocal enabledelayedexpansion
title TURBO SYNC - Control Center

echo ==========================================
echo    TURBO TRANSFER - PRO DEV MODE
echo ==========================================

:: 0. Clean old processes (Prevents "don't stop" issues)
echo [0/3] Cleaning previous sessions...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq Turbo Backend*" >nul 2>&1
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Turbo Frontend*" >nul 2>&1

:: 1. Setup Backend
echo [1/3] Preparing Backend...
where python >nul 2>nul || (echo [ERROR] Python not found! && pause && exit /b)
pip install -r backend/requirements.txt >nul

:: 2. Setup Frontend
echo [2/3] Preparing Frontend...
cd frontend
where node >nul 2>nul || (echo [ERROR] Node.js not found! && pause && exit /b)
if not exist node_modules (
    echo [INFO] First-time setup: Installing dependencies...
    call npm install
)

:: 3. Launch Services
set VITE_DEV=true
echo [3/3] Launching Turbo Sync...

echo [INFO] Starting Secure Backend...
start "Turbo Backend" /min cmd /c "cd ../backend && python main.py"

echo [INFO] Starting Vite HMR Server...
echo [TIP]  App will open automatically. Press Ctrl+C in THIS window to stop everything.
call npm run dev -- --open

:: Cleanup on exit
echo [CLEANUP] Stopping services...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq Turbo Backend*" >nul 2>&1
echo Done.
exit
