@echo off
setlocal enabledelayedexpansion

echo =========================================================
echo   MTC DAM -- Adobe Premiere Pro Extension Installer (Win)
echo =========================================================
echo.

set SERVER_URL=https://dam-for-mtc.onrender.com
set TARGET_DIR=%APPDATA%\Adobe\CEP\extensions\com.mtc.dam.premiere

echo 1. Creating Adobe CEP Extensions directories...
if not exist "%TARGET_DIR%\CSXS" mkdir "%TARGET_DIR%\CSXS"
if not exist "%TARGET_DIR%\js" mkdir "%TARGET_DIR%\js"
if not exist "%TARGET_DIR%\jsx" mkdir "%TARGET_DIR%\jsx"

echo 2. Installing Extension files...
if exist "%~dp0CSXS\manifest.xml" (
    echo   [Local] Copying local extension bundle...
    xcopy /E /Y /I "%~dp0*" "%TARGET_DIR%\" >nul
) else (
    echo   [Online] Downloading extension files from MTC DAM...
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%SERVER_URL%/extensions/premiere/CSXS/manifest.xml', '%TARGET_DIR%\CSXS\manifest.xml')"
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%SERVER_URL%/extensions/premiere/index.html', '%TARGET_DIR%\index.html')"
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%SERVER_URL%/extensions/premiere/js/CSInterface.js', '%TARGET_DIR%\js\CSInterface.js')"
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%SERVER_URL%/extensions/premiere/jsx/Premiere.jsx', '%TARGET_DIR%\jsx\Premiere.jsx')"
)

echo 3. Enabling Adobe Developer Debug Mode in Registry...
reg add "HKCU\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.13" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.14" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.15" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.16" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1

echo.
echo =========================================================
echo   SUCCESS: MTC DAM Extension Installed for Premiere Pro!
echo =========================================================
echo.
echo Files installed to:
echo   %TARGET_DIR%
echo.
echo To use inside Premiere Pro:
echo   1. Launch or Restart Adobe Premiere Pro.
echo   2. Open any project.
echo   3. Click: Window -- Extensions -- MTC DAM Media Hub.
echo.
pause
