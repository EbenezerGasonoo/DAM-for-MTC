# MTC DAM - Windows PowerShell Launcher
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "         MTC Digital Asset Management (DAM)           " -ForegroundColor Cyan
Write-Host "           Starting Local Production Server           " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Download and install from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# 2. Check .env
if (-not (Test-Path ".env")) {
    Write-Host "[*] Initializing .env configuration..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Add-Content .env "DATABASE_URL=`"file:./dev.db`""
    Add-Content .env "JWT_SECRET=`"mtc-dam-$([guid]::NewGuid().ToString())`""
    Add-Content .env "NEXT_PUBLIC_APP_URL=`"http://localhost:3000`""
}

# 3. Prisma DB Sync
Write-Host "[*] Syncing SQLite Database..." -ForegroundColor Gray
npx prisma db push --skip-generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Database schema sync failed." -ForegroundColor Red
    exit 1
}

# 4. Seed admin
Write-Host "[*] Verifying Administrator Account..." -ForegroundColor Gray
node seed-admin.mjs

# 5. Build check
if (-not (Test-Path ".next")) {
    Write-Host "[*] Generating production build (one-time setup)..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Build failed." -ForegroundColor Red
        exit 1
    }
}

# Detect local IP
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback|vEthernet|Virtual' -and $_.IPAddress -notmatch '^169\.' } | Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  MTC DAM is LIVE!" -ForegroundColor Green
Write-Host "  This PC:         http://localhost:3000" -ForegroundColor White
if ($localIP) {
Write-Host "  Local Network:   http://${localIP}:3000" -ForegroundColor White
Write-Host "  (Anyone on your WiFi/Office LAN can access the above link)" -ForegroundColor DarkGray
}
Write-Host "  Default Admin:   admin@mtc.com / admin123" -ForegroundColor Cyan
Write-Host "  Stop server:     Press Ctrl+C" -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""

npm run start -p 3000
