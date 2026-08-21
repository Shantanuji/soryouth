@echo off
setlocal enabledelayedexpansion
title Soryouth CRM - Python Proposal Generator

echo ========================================================
echo         SORYOUTH CRM - PROPOSAL GENERATOR SERVICE
echo ========================================================
echo.

cd /d "%~dp0microservices\proposal_generator"

where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from https://www.python.org/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

if not exist "venv\" (
    echo [INFO] Creating Python virtual environment (venv)...
    python -m venv venv
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [INFO] Installing Python dependencies from requirements.txt...
    call venv\Scripts\activate
    pip install -r requirements.txt
)

echo ========================================================
echo  Starting Python Flask Microservice on port 5001...
echo  URL: http://127.0.0.1:5001
echo ========================================================
echo.

if exist "venv\Scripts\python.exe" (
    call venv\Scripts\activate
    python main.py
) else (
    echo [INFO] Running with system Python...
    python main.py
)

pause
