# GovFleet Infrastructure Starter Script (Windows PowerShell)
Write-Host "🚀 [GovFleet] Starting Core Infrastructure Services..." -ForegroundColor Cyan

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Docker is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force -Path "docker/mosquitto/data" | Out-Null
New-Item -ItemType Directory -Force -Path "docker/mosquitto/log" | Out-Null

docker compose up -d

Write-Host "`n⏳ Checking container status..." -ForegroundColor Yellow
docker compose ps

Write-Host @"
=================================================================
✅ GovFleet Infrastructure is up and running!
=================================================================
📡 Mosquitto MQTT  : mqtt://localhost:1883  (WS: 9001)
⚡ Apache Kafka    : localhost:9092
🔍 Kafka UI        : http://localhost:8085
🧠 Redis           : redis://localhost:6379
🍃 MongoDB         : mongodb://localhost:27017/govfleet
=================================================================
"@ -ForegroundColor Green
