@echo off
setlocal
echo ==============================================
echo       Welcome to StyleHub Application
echo ==============================================

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH. Please install Node.js from https://nodejs.org/.
    pause
    exit /b 1
)

:: Check and Install Backend Dependencies
echo Checking Server Dependencies...
cd server
if not exist "node_modules\" (
    echo Installing Server Dependencies...
    call npm install
)

:: Seed Database if not exists
if not exist "database.sqlite" (
    echo Seeding the Database...
    call npm run seed
)
cd ..

:: Check and Install Frontend Dependencies
echo Checking Client Dependencies...
cd client
if not exist "node_modules\" (
    echo Installing Client Dependencies...
    call npm install
)
cd ..

:: Start Backend and Frontend
echo Starting Backend Server...
start "StyleHub Server" cmd /k "cd server && npm run dev"

echo Starting Frontend Application...
start "StyleHub Client" cmd /k "cd client && npm run dev"

:: Open Browser
echo Waiting for services to boot...
timeout /t 5 >nul
start http://localhost:5173

echo StyleHub is running!
endlocal
