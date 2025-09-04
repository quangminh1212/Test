@echo off
setlocal
cd /d "%~dp0"

echo === Flash Sale Project Setup ===

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo Please install Node.js from https://nodejs.org/ then re-run setup.bat
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm (Node Package Manager) is not in PATH.
  echo Please ensure Node.js installs npm correctly and re-run setup.bat
  exit /b 1
)

echo Installing dependencies...
npm install
if errorlevel 1 (
  echo [ERROR] npm install failed.
  exit /b 1
)

echo Preparing data folder...
if not exist "data" mkdir "data"
if not exist "data\orders.json" (
  echo {"orders": []} > "data\orders.json"
  echo Created data\orders.json
) else (
  echo data\orders.json already exists
)

echo Setup complete.
echo You can now run run.bat to start the app.

endlocal

