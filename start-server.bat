@echo off
echo Building and starting server...
cd /d "%~dp0server"
echo Building TypeScript...
npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    pause
    exit /b 1
)
echo Starting server...
npm start
