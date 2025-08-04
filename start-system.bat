@echo off
echo Starting Stock Management System...
echo.

echo Starting Backend Server...
cd /d "c:\Users\kasan\stock-management-system\server"
start "Backend Server" cmd /k "npx ts-node src/index.ts"

echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend Server...
cd /d "c:\Users\kasan\stock-management-system"
start "Frontend Server" cmd /k "npm run dev"

echo.
echo Both servers should be starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173 or http://localhost:5174
echo.
pause
