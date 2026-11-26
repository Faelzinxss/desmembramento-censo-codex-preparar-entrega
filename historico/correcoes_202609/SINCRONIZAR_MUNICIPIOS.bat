@echo off
cd /d "%~dp0"
title Sincronizar municipios
echo Sincronizando os municipios tratados de 1.4 Municipio_field...
echo.
python sincronizar_municipios_supabase.py --enviar
if errorlevel 1 (
  echo.
  echo A sincronizacao falhou. Nenhuma nova tentativa sera feita automaticamente.
)
echo.
pause
