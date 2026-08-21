@echo off
echo ===================================================
echo     DIRECT PUSH TO HOSTINGER (NO GITHUB REQUIRED)
echo ===================================================
echo.
echo 1. Packing local project files...
tar -czf project-upload.tar.gz --exclude=node_modules --exclude=.git --exclude=.next --exclude=*.db --exclude=project-upload.tar.gz .

echo 2. Uploading files securely directly to server...
scp -i "%~dp0hostinger_rsa" project-upload.tar.gz root@187.127.188.247:/var/www/soryouth-crm/

echo 3. Extracting and rebuilding on the server (This takes a minute)...
ssh -i "%~dp0hostinger_rsa" root@187.127.188.247 "cd /var/www/soryouth-crm && tar -xzf project-upload.tar.gz && rm project-upload.tar.gz && echo Installing Dependencies... && npm install && echo Updating Database... && npx prisma generate && npx prisma db push && echo Building Next.js Website... && npm run build && echo Restarting App... && pm2 restart soryouth-crm"

echo 4. Cleaning up...
del project-upload.tar.gz

echo.
echo ===================================================
echo               DEPLOYMENT COMPLETE!
echo ===================================================
pause
