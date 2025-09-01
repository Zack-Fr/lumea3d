const { performance } = require('perf_hooks');

// Configuration for database performance testing
const DB_TESTS = [
  {
    name: 'User Query Performance',
    query: 'SELECT id, email, display_name FROM users WHERE email = $1',
    params: ['designer@lumea.com'],
    iterations: 1000,
    maxLatency: 50 // ms
  },
  {
    name: 'Project Query Performance',
    query: 'SELECT id, name, user_id FROM projects WHERE user_id = $1',
    params: ['cmf0bzu0o0001nuau2xtbrqem'],
    iterations: 500,
    maxLatency: 100 // ms
  },
  {
    name: 'Scene Query Performance',
    query: 'SELECT id, name, project_id FROM scenes_3d WHERE project_id = $1',
    params: ['demo-project'],
    iterations: 500,
    maxLatency: 100 // ms
  },
  {
    name: 'Scene Items Query Performance',
    query: 'SELECT id, scene_id, category_key, position_x, position_y, position_z FROM scene_items_3d WHERE scene_id = $1',
    params: ['demo-scene-3d'],
    iterations: 300,
    maxLatency: 150 // ms
  },
  {
    name: 'Complex Scene Join Query',
    query: `
      SELECT s.id, s.name, s.version, s.scale, s.exposure,
             si.id as item_id, si.category_key, si.model,
             si.position_x, si.position_y, si.position_z
      FROM scenes_3d s
      LEFT JOIN scene_items_3d si ON s.id = si.scene_id
      WHERE s.project_id = $1 AND s.id = $2
    `,
    params: ['demo-project', 'demo-scene-3d'],
    iterations: 200,
    maxLatency: 200 // ms
  },
  {
    name: 'Session Query Performance',
    query: 'SELECT id, user_id, expires_at FROM sessions WHERE user_id = $1 AND expires_at > NOW()',
    params: ['cmf0bzu0o0001nuau2xtbrqem'],
    iterations: 800,
    maxLatency: 75 // ms
  }
];

async function runDatabasePerformanceTest() {
  console.log('🗄️ Starting Database Performance Testing');
  console.log('=======================================');

  const { execSync } = require('child_process');
  
  const results = [];

  for (const test of DB_TESTS) {
    console.log(`\n📊 Running: ${test.name}`);
    console.log(`   Query: ${test.query.replace(/\s+/g, ' ').trim()}`);
    console.log(`   Iterations: ${test.iterations}`);
    console.log(`   Max expected latency: ${test.maxLatency}ms`);

    const latencies = [];
    let errors = 0;
    let totalRows = 0;

    const startTime = performance.now();

    try {
      for (let i = 0; i < test.iterations; i++) {
        const queryStart = performance.now();
        
        try {
          // Build the psql command
          const paramString = test.params.map((param, index) => `-v param${index + 1}="${param}"`).join(' ');
          let queryWithParams = test.query;
          
          // Replace $1, $2, etc. with actual values for psql
          test.params.forEach((param, index) => {
            queryWithParams = queryWithParams.replace(new RegExp(`\\$${index + 1}`, 'g'), `'${param}'`);
          });

          const command = `docker exec lumea-db psql -U postgres -d lumea -t -c "${queryWithParams}"`;
          const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
          
          const queryEnd = performance.now();
          const latency = queryEnd - queryStart;
          latencies.push(latency);
          
          // Count rows (rough estimate)
          const rowCount = result.trim().split('\n').filter(line => line.trim()).length;
          totalRows += rowCount;
          
        } catch (queryError) {
          const queryEnd = performance.now();
          const latency = queryEnd - queryStart;
          latencies.push(latency);
          errors++;
          
          if (i === 0) { // Log first error for debugging
            console.error(`   First error sample:`, queryError.message.substring(0, 100));
          }
        }

        // Progress indicator
        if (i % Math.floor(test.iterations / 10) === 0 && i > 0) {
          process.stdout.write('.');
        }
      }
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      continue;
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Calculate statistics
    const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const sortedLatencies = latencies.sort((a, b) => a - b);
    const p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
    const p99Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);
    const queriesPerSecond = test.iterations / (totalTime / 1000);

    const testResult = {
      name: test.name,
      iterations: test.iterations,
      totalTime: totalTime,
      avgLatency: avgLatency,
      p95Latency: p95Latency,
      p99Latency: p99Latency,
      minLatency: minLatency,
      maxLatency: maxLatency,
      queriesPerSecond: queriesPerSecond,
      errors: errors,
      errorRate: (errors / test.iterations) * 100,
      totalRows: totalRows,
      maxExpectedLatency: test.maxLatency,
      performanceGood: p95Latency <= test.maxLatency && errors === 0
    };

    results.push(testResult);

    console.log(`\n   Results:`);
    console.log(`     Average latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`     P95 latency: ${p95Latency.toFixed(2)}ms`);
    console.log(`     P99 latency: ${p99Latency.toFixed(2)}ms`);
    console.log(`     Min latency: ${minLatency.toFixed(2)}ms`);
    console.log(`     Max latency: ${maxLatency.toFixed(2)}ms`);
    console.log(`     Queries/sec: ${queriesPerSecond.toFixed(2)}`);
    console.log(`     Errors: ${errors} (${testResult.errorRate.toFixed(2)}%)`);
    console.log(`     Total rows returned: ${totalRows}`);

    // Performance assessment
    if (testResult.performanceGood) {
      console.log(`     ✅ Performance: GOOD`);
    } else {
      if (p95Latency > test.maxLatency) {
        console.log(`     ⚠️  Performance: SLOW (P95: ${p95Latency.toFixed(2)}ms > ${test.maxLatency}ms)`);
      }
      if (errors > 0) {
        console.log(`     ❌ Reliability: POOR (${errors} errors)`);
      }
    }
  }

  // Generate summary report
  console.log('\n📋 DATABASE PERFORMANCE SUMMARY');
  console.log('===============================');

  const successfulTests = results.filter(r => r.errors === 0);
  const slowTests = results.filter(r => r.p95Latency > r.maxExpectedLatency);
  const failedTests = results.filter(r => r.errors > 0);

  console.log(`✅ Successful tests: ${successfulTests.length}/${results.length}`);
  console.log(`⚠️  Slow tests: ${slowTests.length}/${results.length}`);
  console.log(`❌ Failed tests: ${failedTests.length}/${results.length}`);

  if (successfulTests.length > 0) {
    const avgThroughput = successfulTests.reduce((sum, r) => sum + r.queriesPerSecond, 0) / successfulTests.length;
    const avgLatency = successfulTests.reduce((sum, r) => sum + r.avgLatency, 0) / successfulTests.length;
    
    console.log(`\n📈 Overall Performance:`);
    console.log(`   Average throughput: ${avgThroughput.toFixed(2)} queries/sec`);
    console.log(`   Average latency: ${avgLatency.toFixed(2)}ms`);
  }

  if (slowTests.length > 0) {
    console.log(`\n⚠️  Slow Tests:`);
    slowTests.forEach(test => {
      console.log(`   ${test.name}: P95 ${test.p95Latency.toFixed(2)}ms (expected <${test.maxExpectedLatency}ms)`);
    });
  }

  if (failedTests.length > 0) {
    console.log(`\n❌ Failed Tests:`);
    failedTests.forEach(test => {
      console.log(`   ${test.name}: ${test.errors} errors (${test.errorRate.toFixed(2)}%)`);
    });
  }

  console.log('\n🎯 Database performance testing completed!');
  
  return results;
}

// Export for use in other scripts
module.exports = { runDatabasePerformanceTest };

// Run if called directly
if (require.main === module) {
  runDatabasePerformanceTest().catch(error => {
    console.error('💥 Database performance test failed:', error.message);
    process.exit(1);
  });
}