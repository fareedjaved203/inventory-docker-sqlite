@echo off
echo ========================================
echo Inventory Management System Setup
echo ========================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js is installed.

REM Setup Backend
echo.
echo Setting up backend...
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    npm install
)

REM Setup database
echo Setting up database...
if not exist .env (
    echo Creating .env file...
    copy .env.example .env
)

echo Running database migrations...
npx prisma generate
npx prisma migrate dev --name init

cd ..

REM Setup Frontend
echo.
echo Setting up frontend...
cd frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    npm install
)

echo Building frontend...
npm run build

cd ..

REM Start the application
echo.
echo ========================================
echo Starting the application...
echo ========================================
echo The application will be available at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

cd backend
npm start