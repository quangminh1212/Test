@echo off
setlocal
cd /d "%~dp0"

REM Generate a larger data set for testing the streaming counter.
REM Defaults: 10 files x 300MB, target=banana, bias=0.15
REM Usage:
REM   generate.bat                 (uses defaults)
REM   generate.bat 20 500 apple 0.2  (20 files x 500MB, target=apple, bias=0.2)

set FILES=%~1
if "%FILES%"=="" set FILES=10
set SIZEMB=%~2
if "%SIZEMB%"=="" set SIZEMB=300
set TARGET=%~3
if "%TARGET%"=="" set TARGET=banana
set BIAS=%~4
if "%BIAS%"=="" set BIAS=0.15

set /a TOTAL=%FILES% * %SIZEMB% 2>nul
if "%TOTAL%"=="0" set TOTAL=?

echo You are about to generate %FILES% file(s) x %SIZEMB%MB each (~%TOTAL% MB total).
echo Target word: %TARGET%  (bias=%BIAS%)
set /p _CONFIRM=Proceed? (Y/N): 
if /I not "%_CONFIRM%"=="Y" (
  echo Cancelled.
  exit /b 0
)

echo Generating...
node generate-data.js --files %FILES% --sizeMB %SIZEMB% --target %TARGET% --bias %BIAS%
if errorlevel 1 (
  echo Generation failed.
  pause
  exit /b 1
)

echo Generation complete. Files are in "%CD%\data".
pause

