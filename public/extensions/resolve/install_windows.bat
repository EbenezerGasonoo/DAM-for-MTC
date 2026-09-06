@echo off
setlocal enabledelayedexpansion

echo =========================================================
echo   MTC DAM -- DaVinci Resolve Integration Installer (Win)
echo =========================================================
echo.

set SERVER_URL=https://dam-for-mtc.onrender.com
set PLUGIN_DIR=%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\com.mtc.dam.resolve
set SCRIPT_DIR=%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility

echo 1. Creating DaVinci Resolve integration directories...
if not exist "%PLUGIN_DIR%" mkdir "%PLUGIN_DIR%"
if not exist "%SCRIPT_DIR%" mkdir "%SCRIPT_DIR%"

echo 2. Installing Workflow Integration Plugin files...
if exist "%~dp0workflow_integration.json" (
    echo   [Local] Copying workflow_integration.json...
    copy /Y "%~dp0workflow_integration.json" "%PLUGIN_DIR%\" >nul
) else (
    echo   [Online] Downloading workflow_integration.json from MTC DAM...
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%SERVER_URL%/extensions/resolve/workflow_integration.json', '%PLUGIN_DIR%\workflow_integration.json')"
)

if exist "%~dp0index.html" (
    echo   [Local] Copying index.html...
    copy /Y "%~dp0index.html" "%PLUGIN_DIR%\" >nul
) else (
    echo   [Online] Downloading index.html from MTC DAM...
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%SERVER_URL%/extensions/resolve/index.html', '%PLUGIN_DIR%\index.html')"
)

echo 3. Installing Python MediaPool Importer Script...
if exist "%~dp0MTC_DAM_Importer.py" (
    echo   [Local] Copying MTC_DAM_Importer.py...
    copy /Y "%~dp0MTC_DAM_Importer.py" "%SCRIPT_DIR%\" >nul
) else (
    echo   [Online] Downloading MTC_DAM_Importer.py from MTC DAM...
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%SERVER_URL%/extensions/resolve/MTC_DAM_Importer.py', '%SCRIPT_DIR%\MTC_DAM_Importer.py')"
)

echo.
echo =========================================================
echo   SUCCESS: MTC DAM Installed for DaVinci Resolve!
echo =========================================================
echo.
echo Files installed to:
echo   Plugin: %PLUGIN_DIR%
echo   Script: %SCRIPT_DIR%\MTC_DAM_Importer.py
echo.
echo How to access inside DaVinci Resolve:
echo   Method A (Workflow Integration - Studio):
echo     Launch DaVinci Resolve -- Workspace -- Workflow Integrations -- MTC DAM Media Hub
echo.
echo   Method B (Script Utility - Free and Studio):
echo     Launch DaVinci Resolve -- Workspace -- Scripts -- MTC_DAM_Importer
echo.
pause
