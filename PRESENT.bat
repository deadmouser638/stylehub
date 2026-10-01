@echo off
setlocal
cd /d "%~dp0"
node -e "const [a,b]=process.versions.node.split('.').map(Number);if(a<22||(a===22&&b<13))process.exit(1)"
if errorlevel 1 (
 echo Please install Node.js 24 LTS, then run this file again.
 pause
 exit /b 1
)
cd server
call npm ci --omit=dev --no-audit --no-fund
if errorlevel 1 (
 pause
 exit /b 1
)
start "" http://localhost:5000
echo ElectroHub: http://localhost:5000
node server.js
pause
