@echo off
title Soryouth CRM Launcher

echo ========================================================
echo               LAUNCHING SORYOUTH CRM SUITE
echo ========================================================
echo.
echo 1. Starting Python Proposal Generator in background window...
start "Soryouth - Proposal Generator" cmd /k "start-microservice.bat"

echo 2. Starting Next.js Web CRM Server...
start "Soryouth - Web CRM" cmd /k "start-dev.bat"

echo.
echo Both services are starting up!
echo Web Application: http://localhost:9002
echo.
exit /b 0
