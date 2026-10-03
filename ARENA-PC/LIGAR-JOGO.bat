@echo off
chcp 65001 >nul
title ARENA BET
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale a versao LTS em https://nodejs.org e rode de novo.
  pause
  exit /b
)
if not exist node_modules (
  echo Primeira vez: instalando, aguarde...
  call npm install
)
start "" /min cmd /c "npm start"
exit
