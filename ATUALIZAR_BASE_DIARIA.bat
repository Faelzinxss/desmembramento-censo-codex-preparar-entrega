@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title Atualizacao diaria da base de auditoria

set "PYTHON_LOCAL=%LOCALAPPDATA%\desmembramento-censo\python-env-v1\Scripts\python.exe"

"%PYTHON_LOCAL%" -c "import requests, pyodbc" >nul 2>&1
if errorlevel 1 (
  echo Preparando o ambiente Python deste computador...
  set "PREPARAR_SEM_PAUSA=1"
  call "%~dp0manutencao\PREPARAR_AMBIENTE_PYTHON.bat"
  if errorlevel 1 (
    set "CODIGO=1"
    goto fim
  )
)

set "DESMEMBRAMENTO_PYTHON=%PYTHON_LOCAL%"
"%PYTHON_LOCAL%" -c "import pyodbc,sys; sys.exit(0 if 'ODBC Driver 18 for SQL Server' in pyodbc.drivers() else 1)" >nul 2>&1
if errorlevel 1 (
  echo Microsoft ODBC Driver 18 for SQL Server nao foi encontrado.
  echo Instale o driver oficial da Microsoft e execute novamente:
  echo https://learn.microsoft.com/sql/connect/odbc/download-odbc-driver-for-sql-server
  set "CODIGO=1"
  goto fim
)

set "AZURE_CLI=%ProgramFiles%\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
if exist "%AZURE_CLI%" (
  set "AZURE_TENANT_ID=9342ca32-b623-4865-95f9-e3eb2bda4efb"
  if defined DESMEMBRAMENTO_AZURE_TENANT_ID set "AZURE_TENANT_ID=!DESMEMBRAMENTO_AZURE_TENANT_ID!"
  set "AZURE_TENANT_ATUAL="
  for /f "usebackq delims=" %%T in (`call "%AZURE_CLI%" account show --query tenantId --output tsv 2^>nul`) do set "AZURE_TENANT_ATUAL=%%T"
  if /I not "!AZURE_TENANT_ATUAL!"=="!AZURE_TENANT_ID!" (
    echo.
    echo Entre na conta corporativa para ler a fonte Azure.
    call "%AZURE_CLI%" login --tenant "!AZURE_TENANT_ID!" --allow-no-subscriptions --output none
    if errorlevel 1 (
      echo Login Azure nao concluido. Nenhuma atualizacao foi executada.
      set "CODIGO=1"
      goto fim
    )
  )
  set "DESMEMBRAMENTO_AZURE_CLI=%AZURE_CLI%"
  set "DESMEMBRAMENTO_AZURE_TENANT_ID=!AZURE_TENANT_ID!"
)

"%PYTHON_LOCAL%" scripts\atualizar_base_oficial.py --confirmar
goto resultado

:resultado
set "CODIGO=%errorlevel%"

:fim
echo.
if "%CODIGO%"=="0" (
  echo Processo finalizado.
) else (
  echo Processo interrompido. Consulte a mensagem e o relatorio exibidos acima.
)
pause
exit /b %CODIGO%
