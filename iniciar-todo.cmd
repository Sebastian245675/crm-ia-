@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js no esta instalado o no esta disponible en PATH.
  echo Instala Node.js 22 o superior y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

node start-all.js
set "START_ALL_EXIT=%ERRORLEVEL%"

if not "%START_ALL_EXIT%"=="0" (
  echo.
  echo El arranque termino con un error.
  pause
)

exit /b %START_ALL_EXIT%
