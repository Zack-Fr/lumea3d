const { io } = require('socket.io-client');

// Configuration
const API_URL = 'http://localhost:3000';
const WS_URL = `${API_URL}/scenes`;
const TEST_CREDENTIALS = {
  email: 'designer@lumea.com',
  password: 'designer123'
};

// Test parameters
const CONCURRENT_CONNECTIONS = 20;
const TEST_DURATION = 30000; // 30 seconds
const OPERATION_INTERVAL = 2000; // Send operation every 2 seconds

let authToken = null;
const connections = [];
const metrics = {
  connectionsEstablished: 0,
  connectionsFailed: 0,
  operationsSent: 0,
  operationsReceived: 0,
  deltaUpdatesReceived: 0,
  errors: 0,
  latencies: [],
  startTime: null,
  endTime: null
};

// Authenticate first
async function authenticate() {
  console.log('🔐 Authenticating for WebSocket load testing...');
  
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

function createWebSocketConnection(connectionId) {
  return new Promise((resolve, reject) => {
    const socket = io(WS_URL, {
      transports: ['websocket'],
      timeout: 5000,
      auth: { token: authToken },
      extraHeaders: { 'Authorization': `Bearer ${authToken}` }
    });

    const connectionData = {
      id: connectionId,
      socket,
      operationsSent: 0,
      operationsReceived: 0,
      deltaUpdatesReceived: 0,
      errors: 0,
      connected: false,
      joinedScene: false
    };

    // Connection events
    socket.on('connect', () => {
      console.log(`📡 Connection ${connectionId}: Connected`);
      connectionData.connected = true;
      metrics.connectionsEstablished++;
      
      // Join the demo scene
      socket.emit('joinScene', {
        projectId: 'demo-project',
        sceneId: 'demo-scene-3d'
      });
    });

    socket.on('connect_error', (error) => {
      console.error(`❌ Connection ${connectionId}: Failed to connect:`, error.message);
      connectionData.errors++;
      metrics.connectionsFailed++;
      metrics.errors++;
      reject(error);
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Connection ${connectionId}: Disconnected -`, reason);
      connectionData.connected = false;
    });

    // Scene events
    socket.on('sceneJoined', (data) => {
      console.log(`🎬 Connection ${connectionId}: Joined scene`);
      connectionData.joinedScene = true;
      resolve(connectionData);
    });

    socket.on('operationReceived', (data) => {
      connectionData.operationsReceived++;
      metrics.operationsReceived++;
      
      // Calculate latency if this was our operation
      if (data.operation.clientTimestamp) {
        const latency = Date.now() - data.operation.clientTimestamp;
        metrics.latencies.push(latency);
      }
    });

    socket.on('sceneDelta', (data) => {
      connectionData.deltaUpdatesReceived++;
      metrics.deltaUpdatesReceived++;
    });

    socket.on('error', (error) => {
      console.error(`❌ Connection ${connectionId}: Error:`, error);
      connectionData.errors++;
      metrics.errors++;
    });

    // Timeout after 10 seconds if no scene join
    setTimeout(() => {
      if (!connectionData.joinedScene) {
        reject(new Error(`Connection ${connectionId} failed to join scene within timeout`));
      }
    }, 10000);
  });
}

function sendRandomOperation(connectionData) {
  if (!connectionData.connected || !connectionData.joinedScene) {
    return;
  }

  const operationTypes = [
    {
      type: 'add',
      target: 'item',
      id: `test-item-${connectionData.id}-${Date.now()}`,
      data: {
        position: { 
          x: Math.random() * 10, 
          y: 0, 
          z: Math.random() * 10 
        },
        rotation: { x: 0, y: Math.random() * 360, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        categoryKey: 'furniture'
      }
    },
    {
      type: 'update',
      target: 'item',
      id: `existing-item-${connectionData.id}`,
      data: {
        position: { 
          x: Math.random() * 10, 
          y: 0, 
          z: Math.random() * 10 
        }
      }
    }
  ];

  const operation = operationTypes[Math.floor(Math.random() * operationTypes.length)];
  operation.clientTimestamp = Date.now();

  connectionData.socket.emit('sceneOperation', operation);
  connectionData.operationsSent++;
  metrics.operationsSent++;
}

async function runWebSocketLoadTest() {
  console.log('🚀 Starting WebSocket Load Test');
  console.log(`   Concurrent connections: ${CONCURRENT_CONNECTIONS}`);
  console.log(`   Test duration: ${TEST_DURATION / 1000}s`);
  console.log(`   Operation interval: ${OPERATION_INTERVAL}ms`);
  
  metrics.startTime = Date.now();
  
  try {
    // Authenticate first
    await authenticate();
    
    console.log('\n📡 Establishing WebSocket connections...');
    
    // Create all connections
    const connectionPromises = [];
    for (let i = 0; i < CONCURRENT_CONNECTIONS; i++) {
      connectionPromises.push(
        createWebSocketConnection(i + 1).catch(error => {
          console.error(`Failed to create connection ${i + 1}:`, error.message);
          return null;
        })
      );
    }
    
    // Wait for all connections to be established
    const establishedConnections = (await Promise.all(connectionPromises))
      .filter(conn => conn !== null);
    
    connections.push(...establishedConnections);
    
    console.log(`✅ Established ${establishedConnections.length}/${CONCURRENT_CONNECTIONS} connections`);
    
    if (establishedConnections.length === 0) {
      throw new Error('No connections could be established');
    }
    
    console.log('\n⚡ Starting operation sending...');
    
    // Start sending operations from each connection
    const operationIntervals = establishedConnections.map(conn => {
      return setInterval(() => {
        sendRandomOperation(conn);
      }, OPERATION_INTERVAL + Math.random() * 1000); // Add some jitter
    });
    
    // Run test for specified duration
    await new Promise(resolve => setTimeout(resolve, TEST_DURATION));
    
    console.log('\n🛑 Stopping operation sending...');
    
    // Stop sending operations
    operationIntervals.forEach(interval => clearInterval(interval));
    
    // Wait a bit for final operations to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    metrics.endTime = Date.now();
    
    // Disconnect all connections
    console.log('🔌 Disconnecting all connections...');
    establishedConnections.forEach(conn => {
      if (conn.socket) {
        conn.socket.disconnect();
      }
    });
    
    // Generate report
    generateReport();
    
  } catch (error) {
    console.error('❌ WebSocket load test failed:', error.message);
    
    // Clean up connections
    connections.forEach(conn => {
      if (conn && conn.socket) {
        conn.socket.disconnect();
      }
    });
    
    throw error;
  }
}

function generateReport() {
  console.log('\n📊 WEBSOCKET LOAD TEST REPORT');
  console.log('=============================');
  
  const testDurationActual = metrics.endTime - metrics.startTime;
  const testDurationSeconds = testDurationActual / 1000;
  
  console.log(`🔗 Connection Metrics:`);
  console.log(`   Attempted: ${CONCURRENT_CONNECTIONS}`);
  console.log(`   Successful: ${metrics.connectionsEstablished}`);
  console.log(`   Failed: ${metrics.connectionsFailed}`);
  console.log(`   Success rate: ${(metrics.connectionsEstablished / CONCURRENT_CONNECTIONS * 100).toFixed(1)}%`);
  
  console.log(`\n⚡ Operation Metrics:`);
  console.log(`   Operations sent: ${metrics.operationsSent}`);
  console.log(`   Operations received: ${metrics.operationsReceived}`);
  console.log(`   Delta updates received: ${metrics.deltaUpdatesReceived}`);
  console.log(`   Operations/sec: ${(metrics.operationsSent / testDurationSeconds).toFixed(2)}`);
  console.log(`   Echo success rate: ${metrics.operationsSent > 0 ? (metrics.operationsReceived / metrics.operationsSent * 100).toFixed(1) : 0}%`);
  
  if (metrics.latencies.length > 0) {
    const sortedLatencies = metrics.latencies.sort((a, b) => a - b);
    const avgLatency = metrics.latencies.reduce((sum, lat) => sum + lat, 0) / metrics.latencies.length;
    const p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
    const p99Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
    
    console.log(`\n⏱️ Latency Metrics:`);
    console.log(`   Average: ${avgLatency.toFixed(2)}ms`);
    console.log(`   P95: ${p95Latency}ms`);
    console.log(`   P99: ${p99Latency}ms`);
    console.log(`   Min: ${Math.min(...metrics.latencies)}ms`);
    console.log(`   Max: ${Math.max(...metrics.latencies)}ms`);
    
    if (p95Latency > 500) {
      console.log(`   ⚠️  HIGH LATENCY: P95 latency exceeds 500ms`);
    }
  }
  
  console.log(`\n❌ Error Metrics:`);
  console.log(`   Total errors: ${metrics.errors}`);
  console.log(`   Error rate: ${(metrics.errors / (metrics.operationsSent || 1) * 100).toFixed(2)}%`);
  
  console.log(`\n📈 Performance Assessment:`);
  
  if (metrics.connectionsEstablished / CONCURRENT_CONNECTIONS >= 0.9) {
    console.log(`   ✅ Connection reliability: GOOD (${(metrics.connectionsEstablished / CONCURRENT_CONNECTIONS * 100).toFixed(1)}%)`);
  } else {
    console.log(`   ⚠️  Connection reliability: POOR (${(metrics.connectionsEstablished / CONCURRENT_CONNECTIONS * 100).toFixed(1)}%)`);
  }
  
  const opsPerSec = metrics.operationsSent / testDurationSeconds;
  if (opsPerSec >= 10) {
    console.log(`   ✅ Operation throughput: GOOD (${opsPerSec.toFixed(2)} ops/s)`);
  } else {
    console.log(`   ⚠️  Operation throughput: LOW (${opsPerSec.toFixed(2)} ops/s)`);
  }
  
  if (metrics.errors / (metrics.operationsSent || 1) < 0.01) {
    console.log(`   ✅ Error rate: GOOD (${(metrics.errors / (metrics.operationsSent || 1) * 100).toFixed(2)}%)`);
  } else {
    console.log(`   ⚠️  Error rate: HIGH (${(metrics.errors / (metrics.operationsSent || 1) * 100).toFixed(2)}%)`);
  }
  
  console.log('\n🎯 WebSocket load testing completed!');
}

// Run the test
runWebSocketLoadTest().catch(error => {
  console.error('💥 WebSocket load test failed:', error.message);
  process.exit(1);
});