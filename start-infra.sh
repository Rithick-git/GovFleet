#!/usr/bin/env bash
# ==============================================================================
# GovFleet Infrastructure Starter Script (WSL2 / Linux)
# Spins up Mosquitto, Kafka, Redis, MongoDB, and Kafka UI
# ==============================================================================

set -e

echo "🚀 [GovFleet] Starting Core Infrastructure Services..."

# Check Docker availability
if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Error: Docker is not installed or not in PATH."
    echo "💡 If running in WSL2, ensure Docker Desktop has WSL integration enabled."
    exit 1
fi

if ! command -v docker compose >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1; then
    echo "❌ Error: Docker Compose is not installed."
    exit 1
fi

# Ensure mosquitto directories exist with proper write permissions
mkdir -p ./docker/mosquitto/config ./docker/mosquitto/data ./docker/mosquitto/log
chmod -R 777 ./docker/mosquitto/data ./docker/mosquitto/log 2>/dev/null || true

# Compose command detector
COMPOSE_CMD="docker compose"
if ! docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
fi

# Bring up the stack
$COMPOSE_CMD up -d

echo "⏳ Waiting for healthchecks to pass..."
$COMPOSE_CMD ps

echo ""
echo "================================================================="
echo "✅ GovFleet Infrastructure is up and running!"
echo "================================================================="
echo "📡 Mosquitto MQTT  : mqtt://localhost:1883  (WS: 9001)"
echo "⚡ Apache Kafka    : localhost:9092"
echo "🔍 Kafka UI        : http://localhost:8085"
echo "🧠 Redis           : redis://localhost:6379"
echo "🍃 MongoDB         : mongodb://localhost:27017/govfleet"
echo "================================================================="
