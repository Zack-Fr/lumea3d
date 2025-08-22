# Lumea Development Automation
# Usage: make <command>

.PHONY: help up down wait migrate seed generate metrics demo-fail restore openapi types-openapi clean logs

# Default target
help:
	@echo "Lumea Development Commands:"
	@echo "  up              - Start all services with Docker Compose"
	@echo "  down            - Stop all services"
	@echo "  wait            - Wait for services to be healthy"
	@echo "  migrate         - Run database migrations"
	@echo "  seed            - Seed database with demo data"
	@echo "  generate        - Test scene generation pipeline"
	@echo "  metrics         - View API metrics"
	@echo "  demo-fail       - Simulate solver failure for testing"
	@echo "  restore         - Restore services after demo-fail"
	@echo "  openapi         - Generate OpenAPI documentation"
	@echo "  types-openapi   - Generate TypeScript types from OpenAPI"
	@echo "  logs            - View service logs"
	@echo "  clean           - Clean up containers and volumes"

# Start services
up:
	@echo "🚀 Starting Lumea services..."
	cd infra && docker-compose up --build -d

# Stop services
down:
	@echo "🛑 Stopping Lumea services..."
	cd infra && docker-compose down

# Wait for services to be healthy
wait:
	@echo "⏳ Waiting for services to be healthy..."
	@timeout=60; \
	while [ $$timeout -gt 0 ]; do \
		if docker ps --filter "name=lumea-db" --filter "health=healthy" | grep -q lumea-db && \
		   docker ps --filter "name=lumea-api" --filter "health=healthy" | grep -q lumea-api && \
		   docker ps --filter "name=lumea-solver" --filter "health=healthy" | grep -q lumea-solver; then \
			echo "✅ All services are healthy"; \
			exit 0; \
		fi; \
		echo "Waiting for services... ($$timeout seconds remaining)"; \
		sleep 2; \
		timeout=$$((timeout-2)); \
	done; \
	echo "❌ Timeout waiting for services to be healthy"; \
	exit 1

# Run database migrations
migrate:
	@echo "🗄️  Running database migrations..."
	docker exec lumea-api npm run prisma:migrate

# Seed database with demo data
seed:
	@echo "🌱 Seeding database with demo data..."
	docker exec lumea-api npm run prisma:seed

# Test scene generation
generate:
	@echo "🎨 Testing scene generation..."
	@curl -s -X POST http://localhost:3000/projects/demo/scenes/generate \
		-H "Content-Type: application/json" \
		-d '{"seed": 12345, "style": "modern"}' | \
		python -m json.tool || echo "❌ Generate test failed"

# View API metrics
metrics:
	@echo "📊 API Metrics:"
	@curl -s http://localhost:3000/admin/metrics | python -m json.tool || echo "❌ Metrics unavailable"

# Simulate solver failure for testing graceful degradation
demo-fail:
	@echo "💥 Simulating solver failure..."
	docker stop lumea-solver

# Restore solver after demo-fail
restore:
	@echo "🔧 Restoring solver service..."
	docker start lumea-solver

# Generate OpenAPI documentation
openapi:
	@echo "📚 Generating OpenAPI documentation..."
	@curl -s http://localhost:3000/docs-json > docs/openapi.json
	@echo "OpenAPI spec saved to docs/openapi.json"

# Generate TypeScript types from OpenAPI (optional)
types-openapi:
	@echo "🔧 Generating TypeScript types from OpenAPI..."
	@echo "This would use openapi-typescript or similar tool"

# View logs from all services
logs:
	@echo "📋 Service logs:"
	cd infra && docker-compose logs -f

# Clean up everything
clean:
	@echo "🧹 Cleaning up containers and volumes..."
	cd infra && docker-compose down -v --remove-orphans
	docker system prune -f

# Development workflow shortcuts
dev-reset: down clean up wait migrate seed
	@echo "🔄 Full development environment reset complete"

dev-quick: up wait
	@echo "⚡ Quick start complete"

# Health check all services
health:
	@echo "🏥 Health check:"
	@echo -n "Database: "; curl -s http://localhost:5432 && echo "✅" || echo "❌"
	@echo -n "API: "; curl -s http://localhost:3000/health && echo "✅" || echo "❌"
	@echo -n "Solver: "; curl -s http://localhost:8000/health && echo "✅" || echo "❌"
	@echo -n "Web: "; curl -s http://localhost:5173 && echo "✅" || echo "❌"