@echo off
setlocal enabledelayedexpansion
title Soryouth CRM - Initial Setup

echo ========================================================
echo               SORYOUTH CRM - INITIAL SETUP
echo ========================================================
echo.

:: 1. Check Node.js
echo [1/5] Checking Node.js installation...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is NOT installed or NOT in PATH!
    echo Please install Node.js (LTS v18 or v20) from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
node -v
echo [OK] Node.js is ready.
echo.

:: 2. Setup .env
echo [2/5] Setting up environment configuration (.env)...
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo [OK] Created .env from .env.example.
    ) else (
        echo DATABASE_URL="file:./dev.db" > .env
        echo JWT_SECRET=f4d3b8e0a6c2d1e8f7a9b3c5d6e7f8a9b3c5d6e7f8a9b3c5d6e7f8a9b3c5d6e7 >> .env
        echo PYTHON_MICROSERVICE_URL="http://127.0.0.1:5001" >> .env
        echo [OK] Created default .env file.
    )
) else (
    echo [OK] .env file already exists.
)
echo.

:: 3. Install NPM Packages
echo [3/5] Installing npm packages (this may take a minute)...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm install failed. Please check your internet connection or npm logs.
    pause
    exit /b 1
)
echo [OK] NPM dependencies installed successfully.
echo.

:: 4. Prisma Client & Database
echo [4/5] Preparing Prisma client and Database...
call npx prisma generate
call npx prisma db push --skip-generate
echo [OK] Prisma database initialized.
echo.

:: 5. Seed Super Admin User
echo [5/5] Checking/Creating default Super Admin user...
node seed-admin.js
echo.

echo ========================================================
echo               SETUP COMPLETED SUCCESSFULLY!
echo ========================================================
echo.
echo Default Admin Login Credentials:
echo   Email:    admin@soryouth.com
echo   Password: adminpassword123
echo.
echo You can now double-click 'start-dev.bat' or run 'npm run dev' to launch the CRM.
echo.
pause
