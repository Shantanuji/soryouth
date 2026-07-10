@echo off
echo ===================================================
echo     DEPLOYING SORYOUTH CRM TO HOSTINGER
echo ===================================================
echo.
echo Connecting to server and updating everything...
echo This will take a couple of minutes...
echo.

ssh -i hostinger_rsa root@187.127.188.247 "cd /var/www/soryouth-crm && echo 1. Pulling Latest Code... && git pull origin main && echo 2. Installing Node Modules... && npm install && echo 3. Updating Database... && npx prisma generate && npx prisma db push && echo 4. Building Next.js Website... && npm run build && echo 5. Restarting App... && pm2 restart soryouth-crm"

echo.
echo ===================================================
echo               DEPLOYMENT COMPLETE!
echo ===================================================
pause
