# 🚀 Lumea Development Setup

## Prerequisites

### Required Tools
- **Node.js 22+** - JavaScript runtime
- **pnpm 10+** - Package manager
- **Docker Desktop** - Containerization
- **Git** - Version control
- **Python 3.11+** - For solver service

### Recommended Tools
- **VS Code** - IDE with recommended extensions
- **Postman/Insomnia** - API testing
- **DBeaver/pgAdmin** - Database management

## 🛠️ Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/Zack-Fr/Artica.git
cd lumea
```

### 2. Install Dependencies
```bash
# Install all workspace dependencies
pnpm install

# Install Python dependencies for solver
cd apps/solver
pip install -r requirements.txt
cd ../..
```

### 3. Environment Setup
```bash
# Copy environment template
cp infra/.env.example infra/.env

# Update with your local configuration
# Edit infra/.env with your preferred values
```

### 4. Database Setup
```bash
# Start PostgreSQL with Docker
make up

# Wait for services to be healthy
make wait

# Run database migrations
make migrate

# Seed with demo data
make seed
```

### 5. Start Development
```bash
# Start all services in development mode
pnpm dev

# Or start individual services:
# API: cd apps/api && pnpm start:dev
# Web: cd apps/web && pnpm dev
# Solver: cd apps/solver && pnpm dev
```

## 🐳 Docker Development

### Full Stack with Docker
```bash
# Start entire stack
make up wait migrate seed

# View logs
make logs

# Stop services
make down

# Clean reset
make clean
```

### Service URLs
- **Web App**: http://localhost:5173
- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/docs
- **Solver**: http://localhost:8000
- **Database**: localhost:5432

## 🧪 Testing

### Run All Tests
```bash
# All workspace tests
pnpm test

# With coverage
pnpm test:cov

# Watch mode
pnpm test:watch
```

### Test Individual Services
```bash
# API tests
cd apps/api && pnpm test

# Web tests
cd apps/web && pnpm test

# Solver tests
cd apps/solver && pytest
```

### Integration Testing
```bash
# Test scene generation pipeline
make generate

# Test API health
curl http://localhost:3000/health

# Test solver health
curl http://localhost:8000/health
```

## 🔧 Development Workflow

### Feature Development
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes with tests
3. Run quality checks: `pnpm lint && pnpm typecheck`
4. Commit with conventional format: `feat: add new feature`
5. Push and create PR

### Database Changes
1. Update `prisma/schema.prisma`
2. Generate migration: `cd apps/api && pnpm prisma:migrate`
3. Update seed script if needed
4. Test with: `make migrate seed`

### Code Quality
```bash
# Lint all code
pnpm lint

# Fix lint issues
pnpm lint --fix

# Type checking
pnpm typecheck

# Format code
pnpm format
```

## 📦 Build & Deploy

### Local Build
```bash
# Build all packages
pnpm build

# Build specific service
cd apps/api && pnpm build
```

### Docker Build
```bash
# Build individual services
docker build -t lumea-api ./apps/api
docker build -t lumea-web ./apps/web
docker build -t lumea-solver ./apps/solver

# Build with Docker Compose
docker-compose -f infra/docker-compose.yml build
```

## 🎯 Demo Credentials

After running `make seed`, use these credentials:

- **Admin**: admin@lumea.com / admin123
- **Designer**: designer@lumea.com / designer123  
- **Client**: client@lumea.com / client123

## 🔍 Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check Docker is running
docker ps

# Reset everything
make clean
make up wait migrate seed
```

#### Database Connection Issues
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check environment variables
cat infra/.env | grep DATABASE
```

#### Port Conflicts
```bash
# Check what's using ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :5173
netstat -tulpn | grep :8000

# Update ports in infra/.env if needed
```

#### Permission Issues (Linux/macOS)
```bash
# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker

# Fix file permissions
sudo chown -R $USER:$USER .
```

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [React Documentation](https://react.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [OR-Tools Documentation](https://developers.google.com/optimization)

## 🆘 Getting Help

1. Check this documentation
2. Look at existing issues in GitHub
3. Create a new issue with the bug report template
4. Ask in project discussions

## 🔄 Staying Updated

```bash
# Pull latest changes
git pull origin dev

# Update dependencies
pnpm install

# Rebuild if needed
make clean
make up wait migrate seed
```