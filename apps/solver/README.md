# Lumea Solver

A FastAPI-based constraint satisfaction solver for interior layout generation using OR-Tools.

## Overview

The Lumea Solver is a microservice that generates optimal furniture layouts for interior spaces using constraint satisfaction programming. It's designed to integrate with the Lumea backend AI features to provide intelligent space planning capabilities.

## Features

- **Constraint Satisfaction**: Uses OR-Tools CP-SAT solver for optimal layout generation
- **Rule-based Validation**: Validates layouts against accessibility and design rules
- **AI Integration Ready**: Designed for seamless integration with backend AI features
- **RESTful API**: FastAPI-based service with automatic documentation
- **Deterministic Results**: Reproducible layouts using seed-based generation
- **Extensible Rules Engine**: Easy to add new layout rules and constraints

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Core Functionality
- `POST /solve` - Generate optimal furniture layout
- `POST /validate` - Validate existing furniture placements
- `POST /solve-from-backend` - AI integration endpoint for backend data

## Data Models

### Input Models
- `SolveRequest`: Room dimensions, furniture assets, constraints
- `ValidateRequest`: Placements to validate against rules

### Output Models
- `SolveResponse`: Generated placements, compliance checks, rationale
- `ValidateResponse`: Validation results for placements

## Development

### Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
pnpm dev
# or
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Testing
```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Run linting
pnpm lint

# Format code
pnpm format
```

### Docker
```bash
# Build image
docker build -t lumea-solver .

# Run container
docker run -p 8000:8000 lumea-solver
```

## Architecture

### Core Components

1. **ConstraintSolver**: Main solver class using OR-Tools CP-SAT
2. **RulesEngine**: Validates layouts against design rules
3. **AIIntegrationHelper**: Utilities for backend integration
4. **ORToolsSolver**: Low-level OR-Tools implementation (future)

### Solver Logic

The solver uses constraint satisfaction programming to:

1. **Define Variables**: Furniture positions (x, y) and rotations
2. **Add Constraints**: 
   - Room boundaries
   - No furniture overlapping
   - Accessibility requirements (walkways, clearances)
   - Furniture relationships (coffee table near sofa)
3. **Optimize**: Minimize unused space, maximize aesthetic balance
4. **Validate**: Check generated layout against all rules

### Rules Engine

Supports various layout rules:
- `no-collision`: No furniture overlapping
- `in-bounds`: All furniture within room boundaries
- `sofa-front-walkway-60`: 60cm clearance in front of sofa
- `coffee-centered-to-sofa`: Coffee table centered relative to sofa
- `side-table-adjacent`: Side table adjacent to sofa

## Integration with Backend AI

The solver is designed to integrate with the Lumea backend for AI-powered features:

### Workflow
1. Backend sends scene data via `/solve-from-backend`
2. Solver processes constraints and generates optimal layout
3. Results returned in backend-compatible format
4. Backend stores placements and updates 3D scene

### Data Transformation
- **Input**: Backend scene schema → Solver request format
- **Output**: Solver results → Backend placement format
- **Metadata**: Solver performance and version information

## OR-Tools Implementation

The solver uses Google's OR-Tools constraint programming library:

### Constraint Types
- **Integer Variables**: Furniture positions and rotations
- **Linear Constraints**: Boundary and spacing requirements
- **Boolean Variables**: Furniture placement decisions
- **No-overlap Constraints**: Prevent furniture collisions

### Optimization Objectives
- Minimize unused space
- Maximize furniture accessibility
- Balance aesthetic composition
- Respect user preferences

## Configuration

### Solver Settings
- `max_iterations`: Maximum solver iterations (default: 1000)
- `timeout_seconds`: Solver timeout (default: 30s)
- `optimization_level`: "fast", "balanced", or "optimal"

### Rule Definitions
- Clearance requirements (walkways, doors, walls)
- Furniture relationship distances
- Accessibility standards

## Performance

### Benchmarks
- Simple rooms (3-5 pieces): < 100ms
- Complex rooms (10+ pieces): < 2000ms
- Large spaces (20+ pieces): < 5000ms

### Scalability
- Horizontal scaling via multiple solver instances
- Caching for repeated similar requests
- Async processing for large batch operations

## Future Enhancements

1. **Machine Learning Integration**: Learn from user preferences
2. **Style-based Constraints**: Different rules for modern, traditional, etc.
3. **Multi-room Solving**: Optimize layouts across connected spaces
4. **Real-time Constraints**: Handle dynamic furniture requirements
5. **3D Collision Detection**: Advanced spatial reasoning

## Testing

Comprehensive test suite covering:
- API endpoint functionality
- Solver algorithm correctness
- Rules engine validation
- AI integration workflows
- Performance benchmarks
- Error handling scenarios

## API Documentation

When running the service, visit:
- `http://localhost:8000/docs` - Interactive Swagger UI
- `http://localhost:8000/redoc` - ReDoc documentation

## Contributing

1. Follow PEP 8 style guidelines
2. Add tests for new features
3. Update documentation
4. Run linting and formatting before commits

## License

MIT License - see LICENSE file for details