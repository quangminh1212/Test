@echo off
setlocal
cd /d "%~dp0"

echo === Starting Flash Sale server ===

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  exit /b 1
)

echo Server will run at http://localhost:3000
set PORT=3000

REM Start server
node server.js

endlocal

