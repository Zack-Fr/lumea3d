# Lumea Project - Code Quality Guidelines

## 🎯 Code Quality Standards

### TypeScript/JavaScript
- Use ESLint with Prettier for consistent formatting
- Follow NestJS and React best practices
- Maintain 80%+ test coverage
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

### Python (Solver)
- Follow PEP 8 style guidelines
- Use Black for formatting
- Use Ruff for linting
- Add type hints for all functions
- Write docstrings for classes and functions

### Database
- Use descriptive table and column names
- Add proper indexes for query performance
- Include foreign key constraints
- Write migration scripts for schema changes

## 🧪 Testing Standards

### Unit Tests
- Test individual functions and methods
- Mock external dependencies
- Aim for 80%+ coverage

### Integration Tests
- Test API endpoints end-to-end
- Test database operations
- Test service interactions

### E2E Tests
- Test complete user workflows
- Test across multiple services
- Test error scenarios

## 📝 Documentation

### Code Documentation
- Add comments for complex logic
- Document API endpoints with Swagger
- Include README files for each package

### Project Documentation
- Keep README.md up to date
- Document deployment procedures
- Maintain API documentation

## 🔍 Code Review Process

### Before Submitting PR
- [ ] Run all tests locally
- [ ] Run linting and formatting
- [ ] Update documentation if needed
- [ ] Test manually if UI changes

### Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests are comprehensive
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed

## 🚀 Branch Strategy

### Branch Types
- `main` - Production-ready code
- `dev` - Development integration branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Emergency production fixes

### Workflow
1. Create feature branch from `dev`
2. Implement feature with tests
3. Create PR to `dev`
4. After review and CI pass, merge to `dev`
5. Create PR from `dev` to `main` for releases