const autocannon = require('autocannon');

// Configuration
const API_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
  email: 'designer@lumea.com',
  password: 'designer123'
};

let authToken = null;

// Authenticate first
async function authenticate() {
  console.log('🔐 Authenticating for load testing...');
  
  const fetch = (await import('node-fetch')).default;
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_CREDENTIALS),
  });
  
  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status}`);
  }
  
  const data = await response.json();
  authToken = data.accessToken;
  console.log('✅ Authentication successful');
  return authToken;
}

// Test configurations for different endpoints
const testConfigs = [
  {
    name: 'Health Check Endpoint',
    url: `${API_URL}/health`,
    method: 'GET',
    headers: {},
    connections: 50,
    duration: 30,
    expectedStatusCodes: [200]
  },
  {
    name: 'Authentication Endpoint',
    url: `${API_URL}/auth/login`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_CREDENTIALS),
    connections: 20,
    duration: 30,
    expectedStatusCodes: [200, 201]
  },
  {
    name: 'User Profile Endpoint (Authenticated)',
    url: `${API_URL}/auth/profile`,
    method: 'GET',
    headers: {},
    connections: 30,
    duration: 30,
    authenticated: true,
    expectedStatusCodes: [200]
  },
  {
    name: 'Projects List Endpoint (Authenticated)',
    url: `${API_URL}/projects`,
    method: 'GET',
    headers: {},
    connections: 25,
    duration: 30,
    authenticated: true,
    expectedStatusCodes: [200]
  },
  {
    name: 'Scene Details Endpoint (Authenticated)',
    url: `${API_URL}/projects/demo-project/scenes/demo-scene-3d`,
    method: 'GET',
    headers: {},
    connections: 20,
    duration: 30,
    authenticated: true,
    expectedStatusCodes: [200]
  },
  {
    name: 'Scene Manifest Generation (Heavy Operation)',
    url: `${API_URL}/projects/demo-project/scenes/demo-scene-3d/manifest`,
    method: 'GET',
    headers: {},
    connections: 10,
    duration: 30,
    authenticated: true,
    expectedStatusCodes: [200]
  }
];

async function runLoadTest(config) {
  console.log(`\n🚀 Running load test: ${config.name}`);
  console.log(`   URL: ${config.url}`);
  console.log(`   Method: ${config.method}`);
  console.log(`   Connections: ${config.connections}`);
  console.log(`   Duration: ${config.duration}s`);
  
  const headers = { ...config.headers };
  
  // Add authentication if required
  if (config.authenticated && authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  
  const options = {
    url: config.url,
    method: config.method,
    headers,
    connections: config.connections,
    duration: config.duration,
    pipelining: 1,
    timeout: 10000,
  };
  
  if (config.body) {
    options.body = config.body;
  }
  
  try {
    const result = await autocannon(options);
    
    console.log(`\n📊 Results for ${config.name}:`);
    console.log(`   Requests/sec: ${result.requests.average}`);
    console.log(`   Latency avg: ${result.latency.average}ms`);
    console.log(`   Latency p95: ${result.latency.p95}ms`);
    console.log(`   Latency p99: ${result.latency.p99}ms`);
    console.log(`   Total requests: ${result.requests.total}`);
    console.log(`   Total bytes: ${result.throughput.total} bytes`);
    console.log(`   Errors: ${result.errors}`);
    console.log(`   Timeouts: ${result.timeouts}`);
    
    // Check for performance issues
    if (result.latency.p95 > 1000) {
      console.log(`   ⚠️  HIGH LATENCY: P95 latency (${result.latency.p95}ms) exceeds 1000ms`);
    }
    
    if (result.errors > 0) {
      console.log(`   ❌ ERRORS DETECTED: ${result.errors} errors occurred`);
    }
    
    if (result.timeouts > 0) {
      console.log(`   ⏰ TIMEOUTS DETECTED: ${result.timeouts} requests timed out`);
    }
    
    if (result.requests.average < 50 && config.name !== 'Scene Manifest Generation (Heavy Operation)') {
      console.log(`   ⚠️  LOW THROUGHPUT: ${result.requests.average} req/s may be too low`);
    }
    
    return {
      testName: config.name,
      requestsPerSecond: result.requests.average,
      latencyAvg: result.latency.average,
      latencyP95: result.latency.p95,
      latencyP99: result.latency.p99,
      totalRequests: result.requests.total,
      errors: result.errors,
      timeouts: result.timeouts,
      success: result.errors === 0 && result.timeouts === 0
    };
    
  } catch (error) {
    console.error(`❌ Load test failed for ${config.name}:`, error.message);
    return {
      testName: config.name,
      error: error.message,
      success: false
    };
  }
}

async function runAllTests() {
  console.log('🎯 Starting HTTP Load Testing Suite');
  console.log('=====================================');
  
  try {
    // Authenticate first
    await authenticate();
    
    const results = [];
    
    // Run each test sequentially with a delay between tests
    for (const config of testConfigs) {
      const result = await runLoadTest(config);
      results.push(result);
      
      // Wait between tests to avoid overwhelming the server
      console.log('\n⏳ Waiting 5 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Summary report
    console.log('\n📋 LOAD TESTING SUMMARY REPORT');
    console.log('==============================');
    
    const successfulTests = results.filter(r => r.success);
    const failedTests = results.filter(r => !r.success);
    
    console.log(`✅ Successful tests: ${successfulTests.length}`);
    console.log(`❌ Failed tests: ${failedTests.length}`);
    
    if (successfulTests.length > 0) {
      console.log('\n🏆 Performance Summary:');
      const avgThroughput = successfulTests.reduce((sum, r) => sum + (r.requestsPerSecond || 0), 0) / successfulTests.length;
      const avgLatency = successfulTests.reduce((sum, r) => sum + (r.latencyAvg || 0), 0) / successfulTests.length;
      const maxP95Latency = Math.max(...successfulTests.map(r => r.latencyP95 || 0));
      
      console.log(`   Average throughput: ${avgThroughput.toFixed(2)} req/s`);
      console.log(`   Average latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`   Max P95 latency: ${maxP95Latency}ms`);
    }
    
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`   ${test.testName}: ${test.error || 'Unknown error'}`);
      });
    }
    
    console.log('\n🎯 Load testing completed!');
    
  } catch (error) {
    console.error('❌ Load testing suite failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runAllTests();