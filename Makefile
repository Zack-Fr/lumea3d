# Lumea Development Automation
# Usage: make <command>
# Environment: Set ENV=production|test|development (default: development)

.PHONY: help up down wait migrate seed generate metrics openapi types-openapi clean logs health dev-reset dev-quick backfill

# Default target
help:
	@echo "Lumea Development Commands:"
	@echo "  up              - Start all services (ENV=production|test|development)"
	@echo "  down            - Stop all services"
	@echo "  wait            - Wait for services to be healthy"
	@echo "  migrate         - Run database migrations"
	@echo "  seed            - Seed database with demo data"
	@echo "  backfill        - Backfill ProjectMember records for existing projects"
	@echo "  generate        - Test scene generation pipeline"
	@echo "  metrics         - View API metrics"
	@echo "  health          - Check service health"
	@echo "  openapi         - Generate OpenAPI documentation"
	@echo "  types-openapi   - Generate TypeScript types from OpenAPI"
	@echo "  logs            - View service logs"
	@echo "  clean           - Clean up containers and volumes"
	@echo ""
	@echo "Environment Examples:"
	@echo "  make up ENV=production    - Start with production config"
	@echo "  make up ENV=test         - Start with test config"

# Environment variable (default to development if not set)
ENV ?= development

# Start services
up:
	@echo "🚀 Starting Lumea services with environment: $(ENV)..."
	cd infra && docker compose --env-file .env.$(ENV) up --build -d

# Stop services
down:
	@echo "🛑 Stopping Lumea services..."
	cd infra && docker compose --env-file .env.$(ENV) down

# Wait for services to be healthy
wait:
	@echo "⏳ Waiting for services to be healthy..."
	@timeout=60; \
	while [ $$timeout -gt 0 ]; do \
		if docker ps --filter "name=lumea-db" --filter "health=healthy" | grep -q lumea-db && \
		docker ps --filter "name=lumea-api" --filter "health=healthy" | grep -q lumea-api; then \
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
		docker exec lumea-api pnpm prisma:migrate

# Seed database with demo data
seed:
		@echo "🌱 Seeding database with demo data..."
		docker exec lumea-api pnpm prisma:seed

# Backfill ProjectMember records for existing projects
backfill:
		@echo "🔧 Backfilling ProjectMember records..."
		docker exec lumea-api pnpm exec ts-node scripts/backfill-members.ts

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
		cd infra && docker compose --env-file .env.$(ENV) logs -f

# Clean up everything
clean:
	@echo "🧹 Cleaning up containers and volumes..."
	cd infra && docker compose --env-file .env.$(ENV) down -v --remove-orphans
	docker system prune -f

# Development workflow shortcuts
dev-reset: down clean up wait migrate seed
	@echo "🔄 Full development environment reset complete"

dev-quick: up wait
	@echo "⚡ Quick start complete"

# Health check all services
health:
	@echo "🏥 Health check:"
	@echo -n "Database: "; curl -s http://localhost:5434 && echo "✅" || echo "❌"
	@echo -n "API: "; curl -s http://localhost:3000/monitoring/health && echo "✅" || echo "❌"
	@echo -n "Web: "; curl -s http://localhost:80 && echo "✅" || echo "❌"
