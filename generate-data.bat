@echo off
setlocal
cd /d "%~dp0"

REM Usage examples:
REM   generate-data.bat              ^> 3 files x 100MB, target=banana
REM   generate-data.bat 5 200 apple ^> 5 files x 200MB, target=apple

set FILES=%~1
if "%FILES%"=="" set FILES=3
set SIZEMB=%~2
if "%SIZEMB%"=="" set SIZEMB=100
set TARGET=%~3
if "%TARGET%"=="" set TARGET=banana

node generate-data.js --files %FILES% --sizeMB %SIZEMB% --target %TARGET%

if errorlevel 1 (
  echo Generation failed.
  pause
  exit /b 1
)

echo Generation complete.
pause

