@echo off
setlocal

REM Change to script directory
cd /d "%~dp0"

REM Check Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not in PATH.
  echo Please install Node.js from https://nodejs.org/ and try again.
  pause
  exit /b 1
)

REM Ensure data directory exists
if not exist "data" (
  mkdir "data"
)

if "%PORT%"=="" set PORT=3000

REM Free the port if already in use
echo Ensuring port %PORT% is free...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT% " ^| findstr LISTENING') do (
  echo Killing PID %%p using port %PORT%...
  taskkill /F /PID %%p >nul 2>&1
)
REM Small delay to allow OS to release the port
ping -n 2 127.0.0.1 >nul


echo Starting server on http://localhost:%PORT%
echo Data directory: "%CD%\data"

echo Press Ctrl+C to stop the server.
node server.js

set EXITCODE=%ERRORLEVEL%
echo Server exited with code %EXITCODE%.
pause

