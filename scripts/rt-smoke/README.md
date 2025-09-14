# Realtime System Smoke Tests

This directory contains smoke test scripts to validate the realtime system functionality.

## Scripts

### `ws_smoke.mjs` - WebSocket Smoke Test
Tests the primary WebSocket realtime functionality including:
- Connection establishment with JWT authentication
- HELLO message receipt with scene version and server time
- PRESENCE updates for multiple clients
- Camera message broadcasting with coalescing
- Chat message broadcasting
- Rate limiting and throttling
- PING/PONG latency measurement

### `sse_smoke.mjs` - SSE Smoke Test  
Tests the Server-Sent Events fallback functionality including:
- SSE connection establishment
- Authentication via Authorization header
- HELLO and PRESENCE event receipt
- Stream continuity over time
- Proper SSE headers and formatting
- Authentication rejection for invalid tokens

## Prerequisites

1. **Node.js Dependencies**: Install required packages
   ```bash
   npm install socket.io-client node-fetch
   ```

2. **Running Server**: Ensure the Lumea API server is running with the realtime module enabled

3. **Environment Variables**: Set the following environment variables or use defaults:
   - `SERVER_URL` - API server URL (default: `http://localhost:3000`)
   - `JWT_TOKEN` - Valid JWT token for authentication (required)
   - `SCENE_ID` - Valid scene ID to test against (required)

## Usage

### Generate Test JWT Token
First, you'll need a valid JWT token. You can generate one using the auth endpoints or use an existing user token.

### Run WebSocket Tests
```bash
# Using environment variables
export SERVER_URL=http://localhost:3000
export JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
export SCENE_ID=550e8400-e29b-41d4-a716-446655440000

node ws_smoke.mjs
```

### Run SSE Tests
```bash
# Using environment variables  
export SERVER_URL=http://localhost:3000
export JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
export SCENE_ID=550e8400-e29b-41d4-a716-446655440000

node sse_smoke.mjs
```

### Run Both Tests
```bash
# Run both test suites
./run-smoke-tests.sh
```

## Test Output

The tests provide detailed logging including:
- Timestamps for all operations
- Connection status and metrics
- Message exchange details
- Test results summary
- Performance metrics (RTT, message counts, etc.)

### Successful Output Example
```
[2023-12-07T10:30:45.123Z] ℹ️ Starting WebSocket smoke test...
[2023-12-07T10:30:45.124Z] ℹ️ Server: http://localhost:3000
[2023-12-07T10:30:45.124Z] ℹ️ Scene ID: 550e8400-e29b-41d4-a716-446655440000
[2023-12-07T10:30:45.200Z] ℹ️ Setting up WebSocket clients...
[2023-12-07T10:30:45.350Z] ℹ️ Both clients connected
[2023-12-07T10:30:45.351Z] ℹ️ Running test: Client 1 receives HELLO message
[2023-12-07T10:30:45.380Z] ℹ️ Received HELLO: version=42, serverTime=1701944445380
[2023-12-07T10:30:45.381Z] ✅ ✓ Client 1 receives HELLO message
...
[2023-12-07T10:30:47.500Z] ℹ️ Test Results: 7/7 passed
[2023-12-07T10:30:47.501Z] ✅ 🎉 All WebSocket smoke tests passed!
```

## Integration with CI/CD

These smoke tests are designed to run in CI/CD environments:

### Exit Codes
- `0` - All tests passed
- `1` - Some tests failed or setup error

### Environment Setup for CI
```yaml
# Example GitHub Actions step
- name: Run Realtime Smoke Tests
  run: |
    export SERVER_URL=http://localhost:3000
    export JWT_TOKEN=${{ secrets.TEST_JWT_TOKEN }}
    export SCENE_ID=${{ secrets.TEST_SCENE_ID }}
    cd scripts/rt-smoke
    npm install socket.io-client node-fetch
    node ws_smoke.mjs
    node sse_smoke.mjs
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure API server is running on the specified URL
   - Check firewall and network connectivity

2. **Authentication Failures**
   - Verify JWT_TOKEN is valid and not expired
   - Ensure user has access to the specified scene
   - Check JWT_SECRET matches between test token and server

3. **Scene Not Found**
   - Verify SCENE_ID exists in the database  
   - Ensure user has read access to the scene's project

4. **Rate Limiting Tests Failing**
   - May indicate throttling is not working correctly
   - Check realtime gateway configuration
   - Verify presence service is properly initialized

5. **SSE Content Type Issues**
   - Ensure SSE controller is properly configured
   - Check for middleware interfering with response headers

### Debug Mode
Add more verbose logging by setting DEBUG environment variable:
```bash
DEBUG=1 node ws_smoke.mjs
```

## Customization

The test scripts can be customized for different scenarios:

- Modify message payloads in camera/chat tests
- Adjust timeout values for slower environments
- Add custom test cases for specific features
- Configure different rate limiting thresholds

See the source code comments for specific customization points.