# AryogaSutra — start ML API, Spring Boot (H2), and frontend on Windows PowerShell.
# Run from repo root:  powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
# Prerequisites: JDK 17+, Maven, Node.js, Python 3.10+

$ErrorActionPreference = "Stop"
# scripts/start-local.ps1 -> repo root is parent of scripts/
$root = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $root "backend\pom.xml"))) {
    Write-Error "Could not find backend\pom.xml under $root"
    exit 1
}

Write-Host "Project root: $root" -ForegroundColor Cyan

if (-not $env:JAVA_HOME) {
    $adoptium = "C:\Program Files\Eclipse Adoptium"
    if (Test-Path $adoptium) {
        $jdk = Get-ChildItem $adoptium -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($jdk -and (Test-Path (Join-Path $jdk.FullName "bin\java.exe"))) {
            $env:JAVA_HOME = $jdk.FullName
            Write-Host "Using JAVA_HOME=$env:JAVA_HOME" -ForegroundColor DarkGray
        }
    }
}

# 1) ML model
$ml = Join-Path $root "ml-service"
Set-Location $ml
if (-not (Test-Path ".\artifacts\model_bundle.pkl")) {
    Write-Host "Training ML model..." -ForegroundColor Yellow
    if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
        python -m venv .venv
    }
    & ".\.venv\Scripts\pip.exe" install -q -r requirements.txt
    & ".\.venv\Scripts\python.exe" train_model.py
}

Write-Host "Starting ML API on http://localhost:5000 ..." -ForegroundColor Green
Start-Process -FilePath ".\.venv\Scripts\python.exe" -ArgumentList "-m","uvicorn","app:app","--host","0.0.0.0","--port","5000" -WorkingDirectory $ml -WindowStyle Normal

# 2) Spring Boot (H2 profile)
$backend = Join-Path $root "backend"
Write-Host "Starting Spring Boot on http://localhost:8080 (profile=local, H2) ..." -ForegroundColor Green
Start-Process -FilePath "mvn" -ArgumentList "-q","spring-boot:run","-Dspring-boot.run.profiles=local" -WorkingDirectory $backend -WindowStyle Normal

# 3) Frontend
$fe = Join-Path $root "frontend"
Write-Host "Starting frontend on http://localhost:3000 ..." -ForegroundColor Green
Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory $fe -WindowStyle Normal

Write-Host ""
Write-Host "Opened three windows: ML (5000), Backend (8080), Frontend (3000)." -ForegroundColor Cyan
Write-Host "Open http://localhost:3000 in your browser." -ForegroundColor Cyan
