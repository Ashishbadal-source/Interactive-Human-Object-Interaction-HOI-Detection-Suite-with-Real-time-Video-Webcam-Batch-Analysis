@echo off
title MUREN AI - Live Demo Launcher
echo ===================================================
echo      Launching MUREN AI (Backend + Cloud Tunnel)
echo ===================================================
echo.

:: 1. Start the FastAPI backend server in a minimized window
echo [1/2] Starting MUREN FastAPI Server on http://localhost:8000 ...
start "MUREN Server" /min cmd /c "cd /d "%~dp0" && uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"

:: 2. Wait 6 seconds for the AI model to load in memory
echo Waiting for AI model to load ...
timeout /t 6 /nobreak >nul

:: 3. Launch Cloudflare Tunnel
echo [2/2] Launching Cloudflare Public Tunnel ...
if exist "C:\Users\dell\cloudflared.exe" (
    start "Cloudflare Live Link" cmd /k "echo =================================================== && echo YOUR PUBLIC LIVE LINK WILL APPEAR BELOW: && echo =================================================== && C:\Users\dell\cloudflared.exe tunnel --url http://localhost:8000"
) else (
    start "Cloudflare Live Link" cmd /k "echo =================================================== && echo YOUR PUBLIC LIVE LINK WILL APPEAR BELOW: && echo =================================================== && cloudflared tunnel --url http://localhost:8000"
)

echo.
echo ===================================================
echo All services launched! Check the 'Cloudflare Live Link'
echo window for your public URL.
echo ===================================================
timeout /t 5 >nul
