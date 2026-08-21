@echo off
setlocal enabledelayedexpansion
title Soryouth CRM - Dev Server

echo ========================================================
echo               SORYOUTH CRM - START DEV SERVER
echo ========================================================
echo.

:: 1. Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not found in PATH!
    echo Please download and install Node.js (v18 or higher) from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Check if .env exists
if not exist ".env" (
    echo [INFO] .env not found. Creating .env from .env.example...
    if exist ".env.example" (
        copy .env.example .env >nul
        echo [OK] Created .env file.
    ) else (
        echo [WARNING] .env.example not found. Creating default .env...
        echo DATABASE_URL="file:./dev.db" > .env
        echo JWT_SECRET=f4d3b8e0a6c2d1e8f7a9b3c5d6e7f8a9b3c5d6e7f8a9b3c5d6e7f8a9b3c5d6e7 >> .env
        echo PYTHON_MICROSERVICE_URL="http://127.0.0.1:5001" >> .env
    )
)

:: 3. Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] npm install failed!
        pause
        exit /b 1
    )
)

:: 4. Ensure Prisma Client is generated
echo [INFO] Generating Prisma client...
call npx prisma generate

:: 5. Launch the browser in the background after 3 seconds
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:9002'"

echo.
echo ========================================================
echo  Starting Soryouth CRM Next.js dev server on port 9002...
echo  URL: http://localhost:9002
echo  Press Ctrl+C to stop the server.
echo ========================================================
echo.

call npm run dev

pause
