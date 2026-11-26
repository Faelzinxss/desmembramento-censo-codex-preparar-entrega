@echo off
cd /d "%~dp0"
title Simular sincronizacao dos municipios
echo Esta simulacao compara os municipios tratados com o Supabase sem alterar registros.
echo.
python sincronizar_municipios_supabase.py
echo.
pause
