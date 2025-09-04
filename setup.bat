@echo off
setlocal
cd /d "%~dp0"

echo === Flash Sale Project Setup ===

where node >nul 2>nul
if errorlevel 1 goto :NO_NODE

where npm >nul 2>nul
if errorlevel 1 goto :NO_NPM

echo Installing dependencies...
npm install
if errorlevel 1 goto :NPM_FAIL

echo Preparing data folder...
if not exist "data" mkdir "data"
REM server.js will create data\orders.json automatically if missing

echo Setup complete.
echo You can now run run.bat to start the app.
goto :END

:NO_NODE
echo [ERROR] Node.js is not installed or not in PATH.
echo Please install Node.js from https://nodejs.org/ then re-run setup.bat
exit /b 1

:NO_NPM
echo [ERROR] npm (Node Package Manager) is not in PATH.
echo Please ensure Node.js installs npm correctly and re-run setup.bat
exit /b 1

:NPM_FAIL
echo [ERROR] npm install failed.
exit /b 1

:END
endlocal

