@echo off
chcp 65001 >nul
title ARENA BET - SERVIDOR (feche esta janela para desligar)
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
echo.
echo Servidor ligado. Abra no navegador: http://localhost:3000
echo Seu amigo entra pelo IP desta maquina, porta 3000.
echo.
node server.js
pause
