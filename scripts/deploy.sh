#!/bin/bash

# Lumea Backend Deployment Script for 192.168.1.10
# Usage: ./deploy.sh [environment]
# Default environment: production

set -e

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/infra/docker-compose.yml"
ENV_FILE="$SCRIPT_DIR/infra/.env.$ENVIRONMENT"

echo "🚀 Starting Lumea Backend deployment to 192.168.1.10"
echo "📁 Working directory: $SCRIPT_DIR"
echo "🌍 Environment: $ENVIRONMENT"
echo "📄 Compose file: $COMPOSE_FILE"
echo "⚙️  Environment file: $ENV_FILE"

# Check if environment file exists
if [[ ! -f "$ENV_FILE" ]]; then
    echo "❌ Environment file $ENV_FILE not found!"
    echo "Available environment files:"
    ls -la $SCRIPT_DIR/infra/.env.* 2>/dev/null || echo "No environment files found"
    exit 1
fi

# Check Docker and Docker Compose
echo "🐳 Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available"
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Change to infra directory
cd $SCRIPT_DIR/infra

echo "🔧 Validating Docker Compose configuration..."
if ! docker compose --env-file .env.$ENVIRONMENT config --quiet; then
    echo "❌ Docker Compose configuration is invalid"
    exit 1
fi
echo "✅ Docker Compose configuration is valid"

# Pull latest images and build
echo "📥 Pulling latest base images..."
docker compose --env-file .env.$ENVIRONMENT pull --quiet

echo "🏗️  Building services..."
docker compose --env-file .env.$ENVIRONMENT build --no-cache

# Stop existing services if running
echo "🛑 Stopping existing services..."
docker compose --env-file .env.$ENVIRONMENT down --volumes --remove-orphans || true

# Start services
echo "🚀 Starting services..."
docker compose --env-file .env.$ENVIRONMENT up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to become healthy..."
timeout 300 bash -c '
    while true; do
        if docker compose --env-file .env.'$ENVIRONMENT' ps --format json | jq -r ".[].Health" | grep -q "starting\|unhealthy"; then
            echo "Services still starting..."
            sleep 5
        else
            echo "All services are ready!"
            break
        fi
    done
' || {
    echo "❌ Timeout waiting for services to become healthy"
    echo "📋 Service status:"
    docker compose --env-file .env.$ENVIRONMENT ps
    echo "📄 Service logs:"
    docker compose --env-file .env.$ENVIRONMENT logs --tail=50
    exit 1
}

# Show final status
echo "📋 Final service status:"
docker compose --env-file .env.$ENVIRONMENT ps

# Test endpoints
echo "🧪 Testing service endpoints..."
echo "API Health: http://192.168.1.10:3000/monitoring/health"
curl -f http://192.168.1.10:3000/monitoring/health || echo "❌ API health check failed"

echo "Web App: http://192.168.1.10:80"
curl -f http://192.168.1.10:80 || echo "❌ Web app check failed"

echo "MinIO Console: http://192.168.1.10:9001"
curl -f http://192.168.1.10:9001 || echo "❌ MinIO console check failed"

echo ""
echo "🎉 Deployment completed!"
echo "📍 Services available at:"
echo "   • Web App:      http://192.168.1.10:80"
echo "   • API:          http://192.168.1.10:3000"
echo "   • API Docs:     http://192.168.1.10:3000/docs"
echo "   • MinIO Console: http://192.168.1.10:9001"
echo ""
echo "🔧 To view logs: docker compose --env-file .env.$ENVIRONMENT logs -f"
echo "🛑 To stop:      docker compose --env-file .env.$ENVIRONMENT down"