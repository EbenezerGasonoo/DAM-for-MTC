@echo off
setlocal enabledelayedexpansion

echo =========================================================
echo   MTC DAM -- DaVinci Resolve Integration Installer (Win)
echo =========================================================
echo.

set SERVER_URL=https://dam.mtc-network.space
set PLUGIN_DIR=%PROGRAMDATA%\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\com.mtc.dam.resolve
set SCRIPT_DIR_GLOBAL=%PROGRAMDATA%\Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility
set SCRIPT_DIR_USER=%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility

echo 1. Creating DaVinci Resolve integration directories...
if not exist "%PLUGIN_DIR%" mkdir "%PLUGIN_DIR%"
if not exist "%SCRIPT_DIR_GLOBAL%" mkdir "%SCRIPT_DIR_GLOBAL%"
if not exist "%SCRIPT_DIR_USER%" mkdir "%SCRIPT_DIR_USER%"

echo 2. Installing Studio Workflow Integration Plugin files to ProgramData...
if exist "%~dp0manifest.xml" (
    echo   [Local] Copying manifest.xml...
    copy /Y "%~dp0manifest.xml" "%PLUGIN_DIR%\" >nul
)
if exist "%~dp0package.json" (
    echo   [Local] Copying package.json...
    copy /Y "%~dp0package.json" "%PLUGIN_DIR%\" >nul
)
if exist "%~dp0main.js" (
    echo   [Local] Copying main.js...
    copy /Y "%~dp0main.js" "%PLUGIN_DIR%\" >nul
)
if exist "%~dp0preload.js" (
    echo   [Local] Copying preload.js...
    copy /Y "%~dp0preload.js" "%PLUGIN_DIR%\" >nul
)
if exist "%~dp0index.html" (
    echo   [Local] Copying index.html...
    copy /Y "%~dp0index.html" "%PLUGIN_DIR%\" >nul
)
if exist "%~dp0WorkflowIntegration.node" (
    echo   [Local] Copying WorkflowIntegration.node...
    copy /Y "%~dp0WorkflowIntegration.node" "%PLUGIN_DIR%\" >nul
)

echo 3. Installing Python MediaPool Importer Script...
if exist "%~dp0MTC_DAM_Importer.py" (
    echo   [Local] Copying MTC_DAM_Importer.py to ProgramData and AppData...
    copy /Y "%~dp0MTC_DAM_Importer.py" "%SCRIPT_DIR_GLOBAL%\" >nul
    copy /Y "%~dp0MTC_DAM_Importer.py" "%SCRIPT_DIR_USER%\" >nul
) else (
    echo   [Online] Downloading MTC_DAM_Importer.py from MTC DAM...
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%SERVER_URL%/extensions/resolve/MTC_DAM_Importer.py', '%SCRIPT_DIR_GLOBAL%\MTC_DAM_Importer.py')"
    copy /Y "%SCRIPT_DIR_GLOBAL%\MTC_DAM_Importer.py" "%SCRIPT_DIR_USER%\" >nul
)

echo.
echo =========================================================
echo   SUCCESS: MTC DAM Installed for DaVinci Resolve!
echo =========================================================
echo.
echo Files installed to:
echo   Plugin: %PLUGIN_DIR%
echo   Script: %SCRIPT_DIR_GLOBAL%\MTC_DAM_Importer.py
echo.
echo How to access inside DaVinci Resolve:
echo   Method A (Workflow Integration - Studio):
echo     Launch DaVinci Resolve -^> Workspace -^> Workflow Integrations -^> MTC DAM Media Hub
echo.
echo   Method B (Script Utility - Free and Studio):
echo     Launch DaVinci Resolve -^> Workspace -^> Scripts -^> MTC_DAM_Importer
echo.
pause
