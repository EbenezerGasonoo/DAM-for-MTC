@echo off
title MTC Digital Asset Management - Local Server
color 0A

echo =======================================================
echo          MTC Digital Asset Management (DAM)
echo              Starting Local Production Server
echo =======================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

:: Ensure .env exists
if not exist ".env" (
    echo [*] Creating .env from .env.example...
    copy .env.example .env >nul
    echo DATABASE_URL="file:./dev.db" >> .env
    echo JWT_SECRET="mtc-dam-%RANDOM%%RANDOM%%RANDOM%%RANDOM%" >> .env
    echo NEXT_PUBLIC_APP_URL="http://localhost:3000" >> .env
)

:: Sync Prisma database schema
echo [*] Checking database schema...
call npx prisma db push --skip-generate
if %errorlevel% neq 0 (
    echo [ERROR] Prisma db push failed.
    pause
    exit /b 1
)

:: Ensure default admin user is seeded
echo [*] Checking admin credentials...
call node seed-admin.mjs

:: Check if build exists, if not build it
if not exist ".next" (
    echo [*] Production build not found. Building Next.js application (this may take a minute)...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Build failed.
        pause
        exit /b 1
    )
)

echo.
echo =======================================================
echo  MTC DAM is now running!
echo  Local URL:   http://localhost:3000
echo  Default Login: admin@mtc.com / admin123
echo  Press Ctrl+C in this window to stop the server.
echo =======================================================
echo.

:: Start the Next.js production server
call npm run start -p 3000
pause
