# Lumea - AI-Powered Interior Layout Generator

Lumea is a web-based interior layout generator that demonstrates **solver-guided spatial reasoning** with **explainability**. This MVP showcases how rule-based constraint satisfaction can reliably place furniture in a room while providing clear rationale for design decisions.

## 🎯 Project Overview

- **Phase 0 Goal**: Prove constraint solver approach with explainable results
- **Room Type**: 4m×5m living room (single room focus)
- **Assets**: Sofa, coffee table, side table (3 core furniture pieces)
- **Tech Stack**: React + NestJS + FastAPI + PostgreSQL + OR-Tools
- **Target**: <8s end-to-end layout generation with full compliance reporting

## 🏗️ Architecture

```
/apps
  /web      # React + TypeScript + Vite + React Three Fiber
  /api      # NestJS + Prisma + PostgreSQL
  /solver   # FastAPI + OR-Tools CP-SAT
/packages
  /shared   # TypeScript types + Zod schemas
/infra
  docker-compose.yml  # Full stack orchestration
```

## 🚀 Quick Start

### Prerequisites
- Docker Desktop
- Node.js 22+ (for local development)
- pnpm 10+ (for workspace management)

### Start Development Environment

```bash
# Clone and navigate to project
cd lumea

# Start all services
make up wait migrate seed

# View application
open http://localhost:5173  # Web app
open http://localhost:3000/docs  # API documentation
```

### Available Commands

```bash
make help          # Show all commands
make up            # Start services
make wait          # Wait for healthy services
make migrate       # Run database migrations
make seed          # Add demo data
make generate      # Test layout generation
make metrics       # View API performance metrics
make logs          # View service logs
make down          # Stop services
make clean         # Full cleanup
```

## 🎨 Features

### ✅ Core MVP Features
- **Constraint-based layout generation** with OR-Tools CP-SAT
- **Rule compliance checklist** with pass/fail status
- **Explainable rationale** for each furniture placement
- **Role-based access** (guest, client, designer, admin)
- **Real-time 3D visualization** with React Three Fiber
- **Manual nudging** with post-generation adjustments
- **Private feedback system** for client collaboration

### 🔄 Live Collaboration (View-Only)
- **Host-authoritative sessions** with invite-based access
- **Real-time camera synchronization** across participants
- **Chat and emoji reactions** for collaborative feedback
- **Presence indicators** showing active participants

## 🛡️ Security & Performance

- **JWT-based authentication** with refresh tokens
- **Rate limiting** on critical endpoints
- **Input validation** with Zod schemas
- **Optimistic concurrency** for scene updates
- **Graceful degradation** when solver fails

## 📊 Observability

- **Structured logging** with request tracing
- **Performance metrics** (p50/p95 latencies)
- **Admin dashboard** with usage analytics
- **Health checks** for all services

## 🎯 Success Metrics

- Layout generation **p95 ≤ 8s** end-to-end
- **10/10 generated layouts** pass geometric validation
- **All hard rules enforced**: no collisions, proper clearances
- **Role gates functional**: appropriate access controls
- **Graceful fallback**: no hard errors during demo

## 🔬 Technical Approach

### Constraint Solving
- **10cm grid discretization** for efficient CP-SAT modeling
- **Hard constraints**: bounds, collisions, walkways, adjacency
- **Soft optimization**: walkway margins, wall alignment, centering
- **Best-of-3 evaluation** with different random seeds

### Data Model
- **Immutable scenes** as snapshots
- **Versioned placements** for concurrent updates
- **Compliance audit trail** for explainability
- **Feedback linkage** for continuous improvement

## 🚧 Development Status

**Current Phase**: Core MVP Implementation
- ✅ Monorepo structure
- ✅ Docker orchestration
- 🔄 Database schema & migrations
- 🔄 Authentication & authorization
- 🔄 Constraint solver integration
- ⏳ 3D visualization
- ⏳ Collaboration features

## 📚 Documentation

- **API Documentation**: http://localhost:3000/docs
- **Architecture Decision Records**: `/docs/adr/`
- **Database Schema**: `/apps/api/prisma/schema.prisma`
- **Component Library**: `/docs/components.md`

## 🤝 Contributing

This is a bootcamp demo project focused on proving the solver-guided approach to interior design with explainable AI principles.

---

**Built with ❤️ using modern web technologies and constraint satisfaction principles.**