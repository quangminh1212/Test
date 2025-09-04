@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

echo === Starting Flash Sale server ===

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  exit /b 1
)

REM Choose a free port (prefer 3000, fallback to 3001..3010)
set PORT=3000
set MAX_PORT=3010
:PORT_SCAN
set "PID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do set "PID=%%a"
if defined PID (
  echo Port %PORT% is in use by PID %PID%, trying next...
  set /a PORT+=1
  if %PORT% GTR %MAX_PORT% (
    echo [ERROR] No free port found between 3000 and %MAX_PORT%.
    exit /b 1
  )
  goto PORT_SCAN
)

echo Server will run at http://localhost:%PORT%

REM Start server
node server.js

endlocal

