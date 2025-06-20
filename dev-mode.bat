@echo off
echo ========================================
echo Starting Development Mode
echo ========================================
echo This will start both frontend and backend in development mode
echo Frontend: http://localhost:5173
echo Backend: http://localhost:3000
echo.
echo Press Ctrl+C to stop
echo.

REM Start backend in background
start "Backend Server" cmd /k "cd backend && npm run dev"

REM Wait a moment then start frontend
timeout /t 3 /nobreak >nul
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo Both servers are starting...
echo Check the opened windows for status
pause