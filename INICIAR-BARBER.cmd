@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 24 ou superior e abra este arquivo novamente.
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<24)process.exit(1)"
if errorlevel 1 (
  echo Este aplicativo precisa do Node.js 24 ou superior.
  pause
  exit /b 1
)
echo Acesse http://127.0.0.1:5173 no seu navegador.
echo Mantenha esta janela aberta enquanto usar o aplicativo.
node server/local.mjs
pause
