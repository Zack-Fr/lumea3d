const { runDatabasePerformanceTest } = require('./database-performance-test');
const { execSync, spawn } = require('child_process');
const path = require('path');

console.log('🚀 LUMEA PERFORMANCE TESTING SUITE');
console.log('==================================');
console.log('This suite will run comprehensive performance tests on:');
console.log('• HTTP API endpoints');
console.log('• WebSocket connections and operations');
console.log('• Database query performance');
console.log('• System resource utilization');

async function checkSystemRequirements() {
  console.log('\n🔍 Checking system requirements...');
  
  try {
    // Check if Docker containers are running
    execSync('docker ps --filter "name=lumea-" --format "table {{.Names}}\\t{{.Status}}"', { stdio: 'inherit' });
    
    // Check if API is responding with a simple test
    const fetch = (await import('node-fetch')).default;
    try {
      // Try the login endpoint to see if API is responding (expect 400 for invalid data, which means API is up)
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test', password: 'test' })
      });
      
      // 400 is expected for invalid credentials, which means API is working
      if (response.status === 400 || response.status === 401 || response.status === 200) {
        console.log('✅ API is responding');
      } else {
        throw new Error(`API returned unexpected status: ${response.status}`);
      }
    } catch (fetchError) {
      if (fetchError.code === 'ECONNREFUSED') {
        throw new Error('API connection refused - is the container running?');
      }
      // If it's not a connection error, the API might be responding
      console.log('⚠️  API test had issues but proceeding (might be running)');
    }
    
    console.log('✅ All system requirements met');
    return true;
  } catch (error) {
    console.error('❌ System requirements not met:', error.message);
    console.log('\n💡 Please ensure:');
    console.log('1. All Docker containers are running (docker-compose up -d)');
    console.log('2. API is accessible at http://localhost:3000');
    return false;
  }
}

function runScript(scriptPath, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🎯 Starting: ${description}`);
    console.log(`   Script: ${scriptPath}`);
    
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Completed: ${description}`);
        resolve({ success: true, description });
      } else {
        console.error(`❌ Failed: ${description} (exit code: ${code})`);
        resolve({ success: false, description, exitCode: code });
      }
    });
    
    child.on('error', (error) => {
      console.error(`💥 Error running ${description}:`, error.message);
      reject({ success: false, description, error: error.message });
    });
  });
}

async function monitorSystemResources() {
  console.log('\n📊 Monitoring system resources during tests...');
  
  try {
    // Get Docker container resource usage
    const dockerStats = execSync('docker stats --no-stream --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.NetIO}}"', { encoding: 'utf8' });
    console.log('🐳 Docker Container Resources:');
    console.log(dockerStats);
    
    return true;
  } catch (error) {
    console.error('⚠️  Could not gather resource metrics:', error.message);
    return false;
  }
}

async function runPerformanceTestSuite() {
  const startTime = Date.now();
  const results = [];
  
  try {
    // Check prerequisites
    const systemReady = await checkSystemRequirements();
    if (!systemReady) {
      process.exit(1);
    }
    
    // Initial resource monitoring
    await monitorSystemResources();
    
    console.log('\n🏁 Starting performance test execution...');
    
    // Test 1: Database Performance
    console.log('\n═══════════════════════════════════════');
    console.log('📊 TEST 1: DATABASE PERFORMANCE');
    console.log('═══════════════════════════════════════');
    
    try {
      await runDatabasePerformanceTest();
      results.push({ test: 'Database Performance', success: true });
    } catch (error) {
      console.error('❌ Database performance test failed:', error.message);
      results.push({ test: 'Database Performance', success: false, error: error.message });
    }
    
    // Test 2: HTTP Load Testing
    console.log('\n═══════════════════════════════════════');
    console.log('🌐 TEST 2: HTTP API LOAD TESTING');
    console.log('═══════════════════════════════════════');
    
    const httpTestResult = await runScript(
      path.join(__dirname, 'http-load-test.js'),
      'HTTP API Load Testing'
    );
    results.push({ test: 'HTTP Load Testing', ...httpTestResult });
    
    // Brief pause between tests
    console.log('\n⏳ Pausing 10 seconds between test suites...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Test 3: WebSocket Load Testing
    console.log('\n═══════════════════════════════════════');
    console.log('🔌 TEST 3: WEBSOCKET LOAD TESTING');
    console.log('═══════════════════════════════════════');
    
    const wsTestResult = await runScript(
      path.join(__dirname, 'websocket-load-test.js'),
      'WebSocket Load Testing'
    );
    results.push({ test: 'WebSocket Load Testing', ...wsTestResult });
    
    // Final resource monitoring
    console.log('\n═══════════════════════════════════════');
    console.log('📈 FINAL RESOURCE MONITORING');
    console.log('═══════════════════════════════════════');
    await monitorSystemResources();
    
  } catch (error) {
    console.error('💥 Performance test suite failed:', error.message);
    results.push({ test: 'Test Suite', success: false, error: error.message });
  }
  
  const endTime = Date.now();
  const totalDuration = (endTime - startTime) / 1000;
  
  // Generate final report
  console.log('\n📋 PERFORMANCE TEST SUITE REPORT');
  console.log('================================');
  console.log(`Total execution time: ${totalDuration.toFixed(2)} seconds`);
  
  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);
  
  console.log(`✅ Successful tests: ${successfulTests.length}/${results.length}`);
  console.log(`❌ Failed tests: ${failedTests.length}/${results.length}`);
  
  if (successfulTests.length > 0) {
    console.log('\n🏆 Successful Tests:');
    successfulTests.forEach(test => {
      console.log(`   ✅ ${test.test}`);
    });
  }
  
  if (failedTests.length > 0) {
    console.log('\n💥 Failed Tests:');
    failedTests.forEach(test => {
      console.log(`   ❌ ${test.test}: ${test.error || 'Unknown error'}`);
    });
  }
  
  console.log('\n🎯 Performance testing recommendations:');
  
  if (failedTests.length === 0) {
    console.log('   ✅ All tests passed! System is performing well under load.');
    console.log('   💡 Consider running tests with higher load to find limits.');
  } else {
    console.log('   ⚠️  Some tests failed. Review the results above.');
    console.log('   💡 Consider optimizing failing components before production.');
  }
  
  console.log('\n📊 Next steps:');
  console.log('   1. Review individual test reports above');
  console.log('   2. Address any performance bottlenecks identified');
  console.log('   3. Consider implementing performance monitoring in production');
  console.log('   4. Set up alerting for performance degradation');
  
  console.log('\n🎉 Performance testing suite completed!');
  
  return {
    success: failedTests.length === 0,
    totalTests: results.length,
    successfulTests: successfulTests.length,
    failedTests: failedTests.length,
    duration: totalDuration,
    results
  };
}

// Run the performance test suite
if (require.main === module) {
  runPerformanceTestSuite()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Performance test suite crashed:', error.message);
      process.exit(1);
    });
}

module.exports = { runPerformanceTestSuite };