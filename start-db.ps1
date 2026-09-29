# Script to start EduGuard dedicated PostgreSQL cluster on port 5433
$pgData = "$env:USERPROFILE\.eduguard_pgdata"
$pgBin = "C:\Program Files\PostgreSQL\18\bin"

if (-not (Test-Path $pgData)) {
    Write-Error "PostgreSQL data directory not found at $pgData"
    exit 1
}

# Clean stale PID file if port 5433 is not currently listening
$conn = Get-NetTCPConnection -LocalPort 5433 -ErrorAction SilentlyContinue
if (-not $conn -and (Test-Path "$pgData\postmaster.pid")) {
    Write-Host "Removing stale postmaster.pid..."
    Remove-Item "$pgData\postmaster.pid" -Force -ErrorAction SilentlyContinue
}

# Check if already running
if ($conn) {
    Write-Host "EduGuard PostgreSQL is already running on port 5433." -ForegroundColor Green
    exit 0
}

Write-Host "Starting PostgreSQL cluster on port 5433..."
Start-Process "$pgBin\postgres.exe" -ArgumentList "-D", "`"$pgData`"" -WindowStyle Hidden

Start-Sleep -Seconds 2
$check = Get-NetTCPConnection -LocalPort 5433 -ErrorAction SilentlyContinue
if ($check) {
    Write-Host "PostgreSQL started successfully on port 5433." -ForegroundColor Green
} else {
    Write-Host "PostgreSQL is initializing, verifying connection..."
    Start-Sleep -Seconds 3
    $check = Get-NetTCPConnection -LocalPort 5433 -ErrorAction SilentlyContinue
    if ($check) {
        Write-Host "PostgreSQL started successfully on port 5433." -ForegroundColor Green
    } else {
        Write-Warning "Could not confirm port 5433 yet. Check logs in $pgData\server.log"
    }
}
