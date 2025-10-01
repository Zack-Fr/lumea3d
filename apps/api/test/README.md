# Integration Tests Documentation

This directory contains comprehensive end-to-end integration tests for the Lumea 3D Asset Management API.

## Test Coverage

### Core Test Suites

1. **Asset Upload Pipeline** (`assets.e2e-spec.ts`)
   - Complete asset upload workflow
   - File validation and processing
   - Asset status transitions
   - Error handling and recovery

2. **Scenes Management** (`scenes.e2e-spec.ts`)
   - 3D scene CRUD operations
   - Scene item management
   - Transform validation
   - Scene manifest generation

3. **WebSocket Realtime** (`websocket.e2e-spec.ts`)
   - Realtime collaboration
   - Delta operations
   - Presence tracking
   - Optimistic locking

4. **Asset Downloads** (`downloads.e2e-spec.ts`)
   - Single asset downloads
   - Batch downloads
   - Variant handling (original, meshopt, draco)
   - CDN integration

5. **Full Workflow** (`integration.e2e-spec.ts`)
   - End-to-end workflow testing
   - Performance scenarios
   - Error handling
   - Data consistency

## Running Tests

### Prerequisites

1. **Database Setup**
   ```bash
   # Create test database
   createdb lumea_test
   
   # Set up environment
   cp .env.test.example .env.test
   # Edit .env.test with your test configuration
   ```

2. **MinIO/S3 Setup**
   ```bash
   # Start MinIO for testing
   docker run -d \
     -p 9000:9000 \
     -p 9001:9001 \
     --name minio-test \
     -e "MINIO_ROOT_USER=minioadmin" \
     -e "MINIO_ROOT_PASSWORD=minioadmin" \
     minio/minio server /data --console-address ":9001"
   ```

3. **Redis Setup**
   ```bash
   # Start Redis for testing
   docker run -d -p 6379:6379 --name redis-test redis:alpine
   ```

### Running the Tests

```bash
# Install dependencies
npm install

# Run all integration tests
npm run test:integration

# Run specific test suite
npm run test:e2e -- --testNamePattern="Asset Upload"

# Run with coverage
npm run test:e2e -- --coverage

# Run in watch mode during development
npm run test:e2e -- --watch
```

### Using the Test Runner

```bash
# Automated setup and test execution
node test/run-integration-tests.js
```

The test runner automatically:
- Checks environment variables
- Sets up test database
- Runs all test suites
- Cleans up after completion

## 📋 Test Structure

### Test Setup (`setup.ts`)
- Creates test application instance
- Configures global pipes and filters
- Manages database connections
- Handles test data cleanup

### Test Helpers (`test-helpers.ts`)
- Utility functions for creating test data
- Mock file generators
- Database seeding helpers
- Common test patterns

### Environment Configuration
- `.env.test.example` - Template for test environment
- Separate test database and services
- Isolated test data and storage

## Test Patterns

### Database Management
```typescript
beforeEach(async () => {
  await cleanupTestData(); // Clean slate for each test
});

afterAll(async () => {
  await teardownTestApp(); // Cleanup connections
});
```

### Creating Test Data
```typescript
const { user, token } = await createTestUser();
const { project } = await createTestProject(user);
const { scene } = await createTestScene(project, user);
```

### API Testing
```typescript
const response = await request(testApp.getHttpServer())
  .post('/assets/upload-url')
  .set('Authorization', `Bearer ${authToken}`)
  .send(requestData)
  .expect(201);

expect(response.body).toMatchObject({
  assetId: expect.any(String),
  uploadUrl: expect.stringContaining('https://'),
});
```

### Validation Testing
```typescript
await request(testApp.getHttpServer())
  .post('/scenes/items')
  .send({ positionX: 2000 }) // Invalid position
  .expect(400)
  .expect((res) => {
    expect(res.body.message).toContain('Position coordinate must be between');
  });
```

## Test Scenarios

### Happy Path Testing
- Complete workflows from start to finish
- Data consistency across operations
- Proper response formats
- Expected business logic

### Error Handling
- Invalid input validation
- Resource not found scenarios
- Permission and authorization
- Service failure recovery

### Performance Testing
- Concurrent operations
- Large dataset handling
- Memory usage patterns
- Response time verification

### Edge Cases
- Boundary value testing
- Race condition scenarios
- Network failure simulation
- Partial failure handling

## Coverage Goals

- **Functionality**: 100% of API endpoints
- **Validation**: All custom validators
- **Business Logic**: Scene constraints, asset processing
- **Error Paths**: All error conditions
- **Integration**: Service interactions

## 🐛 Debugging Tests

### Common Issues

1. **Database Connection**
   ```bash
   # Check database is accessible
   psql $DATABASE_URL -c "SELECT 1"
   ```

2. **Port Conflicts**
   ```bash
   # Find processes using test ports
   netstat -tulpn | grep :3001
   ```

3. **Environment Variables**
   ```bash
   # Verify test environment
   cat .env.test
   ```

### Test Debugging
```typescript
// Add debug logging
console.log('Test data:', { userId, projectId, sceneId });

// Use focused tests during development
it.only('should debug specific scenario', async () => {
  // Your test here
});
```

### Memory Leaks
```bash
# Run with memory monitoring
node --max-old-space-size=4096 --expose-gc node_modules/.bin/jest --config ./test/jest-e2e.json
```

## Continuous Integration

### GitHub Actions Integration
```yaml
- name: Run Integration Tests
  run: |
    npm run test:integration
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    REDIS_URL: ${{ secrets.TEST_REDIS_URL }}
```

### Docker Test Environment
```dockerfile
# Use for consistent test environment
FROM node:18-alpine
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "test:integration"]
```

## 🔄 Maintenance

### Updating Tests
- Keep tests synchronized with API changes
- Update test data when schema changes
- Maintain helper functions
- Review coverage reports regularly

### Performance Monitoring
- Track test execution time
- Monitor resource usage
- Optimize slow tests
- Parallelize where possible

---

For questions or issues with the integration tests, please refer to the main project documentation or create an issue in the repository.