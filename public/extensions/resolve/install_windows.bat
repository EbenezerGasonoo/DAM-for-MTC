@echo off
echo =========================================================
echo   MTC DAM — DaVinci Resolve Integration Installer (Win)
echo =========================================================
echo.

set PLUGIN_DIR=%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\com.mtc.dam.resolve
set SCRIPT_DIR=%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility

echo 1. Creating DaVinci Resolve integration directories...
if not exist "%PLUGIN_DIR%" mkdir "%PLUGIN_DIR%"
if not exist "%SCRIPT_DIR%" mkdir "%SCRIPT_DIR%"

echo 2. Installing Workflow Integration Plugin...
copy /Y "%~dp0workflow_integration.json" "%PLUGIN_DIR%\"
copy /Y "%~dp0index.html" "%PLUGIN_DIR%\"

echo 3. Installing Python MediaPool Importer Script...
copy /Y "%~dp0MTC_DAM_Importer.py" "%SCRIPT_DIR%\"

echo.
echo =========================================================
echo   SUCCESS! MTC DAM Installed for DaVinci Resolve!
echo =========================================================
echo.
echo To use inside DaVinci Resolve:
echo   Method A (Workflow Integration):
echo     Launch DaVinci Resolve Studio -> Workspace -> Workflow Integrations -> MTC DAM Media Hub.
echo.
echo   Method B (Script Utility / Free & Studio):
echo     Launch DaVinci Resolve -> Workspace -> Scripts -> MTC_DAM_Importer.
echo.
pause
