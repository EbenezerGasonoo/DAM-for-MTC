@echo off
echo =========================================================
echo   MTC DAM — Adobe Premiere Pro Extension Installer
echo =========================================================
echo.

set TARGET_DIR=%APPDATA%\Adobe\CEP\extensions\com.mtc.dam.premiere

echo 1. Creating Adobe CEP Extensions directory...
if not exist "%APPDATA%\Adobe\CEP\extensions" mkdir "%APPDATA%\Adobe\CEP\extensions"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo 2. Copying extension files...
xcopy /E /Y /I "%~dp0*" "%TARGET_DIR%\"

echo 3. Enabling Adobe Developer Debug Mode...
reg add "HKCU\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.13" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.14" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.15" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.16" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1

echo.
echo =========================================================
echo   SUCCESS! MTC DAM Extension Installed for Premiere Pro!
echo =========================================================
echo.
echo To use inside Premiere Pro:
echo   1. Launch or Restart Adobe Premiere Pro.
echo   2. Open any project.
echo   3. Click: Window -> Extensions -> MTC DAM Media Hub.
echo.
pause
