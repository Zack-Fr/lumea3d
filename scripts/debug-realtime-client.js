#!/usr/bin/env node

/**
 * Debug Realtime Test Client
 * Enhanced version with detailed logging for troubleshooting connection issues
 */

const { io } = require('socket.io-client');

// Configuration
const SERVER_URL = 'http://localhost:3001';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwibmFtZSI6IlRlc3QgVXNlciIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTc1Nzg3MzM4MiwiZXhwIjoxNzU3OTU5NzgyfQ.32_CeWR8wBXQyiUPqL2xMTM0aKjADZ_3RdPn8GfSjZ4';
const SCENE_ID = 'test-scene-123'; // Valid scene ID from database

console.log('🔍 Debug Realtime Test Client');
console.log(`Server: ${SERVER_URL}`);
console.log(`Scene: ${SCENE_ID}`);
console.log(`Token: ${JWT_TOKEN.substring(0, 20)}...`);

// Decode JWT to check contents
try {
  const jwt = require('jsonwebtoken');
  const decoded = jwt.decode(JWT_TOKEN);
  console.log('\n🔑 JWT Token Contents:');
  console.log('  User ID (sub):', decoded.sub);
  console.log('  Name:', decoded.name);
  console.log('  Email:', decoded.email);
  console.log('  Issued:', new Date(decoded.iat * 1000).toISOString());
  console.log('  Expires:', new Date(decoded.exp * 1000).toISOString());
  console.log('  Is Expired:', Date.now() / 1000 > decoded.exp ? 'YES' : 'NO');
} catch (error) {
  console.error('❌ Error decoding JWT:', error.message);
}

console.log('\n🔗 Attempting to connect...');

// Create WebSocket client with debug options
const client = io(`${SERVER_URL}/rt`, {
  query: {
    token: JWT_TOKEN,
    sceneId: SCENE_ID,
  },
  transports: ['websocket'],
  forceNew: true,
  timeout: 10000,
  autoConnect: true,
  reconnection: false, // Disable reconnection for clearer debugging
});

// Enhanced logging
let connectionStartTime = Date.now();

client.on('connect', () => {
  const connectTime = Date.now() - connectionStartTime;
  console.log(`\n✅ Connected successfully!`);
  console.log(`   Connection ID: ${client.id}`);
  console.log(`   Connection time: ${connectTime}ms`);
  console.log(`   Transport: ${client.io.engine.transport.name}`);
  console.log(`   Socket connected: ${client.connected}`);
  
  // Wait a moment before testing messages
  setTimeout(() => {
    console.log('\n📨 Testing message sending...');
    
    // Test a simple ping first
    console.log('   Sending PING...');
    client.emit('evt', {
      t: 'PING',
      ts: Date.now()
    });
    
  }, 1000);
});

client.on('connect_error', (error) => {
  console.error('\n❌ Connection failed:');
  console.error('   Error:', error.message);
  console.error('   Type:', error.type);
  console.error('   Description:', error.description);
  if (error.context) {
    console.error('   Context:', error.context);
  }
});

client.on('disconnect', (reason, details) => {
  console.log('\n🔌 Disconnected:');
  console.log(`   Reason: ${reason}`);
  console.log(`   Details:`, details);
  console.log(`   Was connected: ${client.connected ? 'YES' : 'NO'}`);
  
  // Analyze disconnect reason
  switch (reason) {
    case 'io server disconnect':
      console.log('   💡 Server actively disconnected the client');
      console.log('   💡 This usually means authentication or authorization failed');
      break;
    case 'io client disconnect':
      console.log('   💡 Client initiated the disconnect');
      break;
    case 'ping timeout':
      console.log('   💡 Connection timed out (no pong received)');
      break;
    case 'transport close':
      console.log('   💡 Transport was closed');
      break;
    case 'transport error':
      console.log('   💡 Transport encountered an error');
      break;
    default:
      console.log(`   💡 Unknown disconnect reason: ${reason}`);
  }
});

client.on('error', (error) => {
  console.error('\n⚠️ Socket error:');
  console.error('   Error:', error);
});

// Enhanced message handlers
client.on('evt', (data) => {
  console.log(`\n📨 Received event: ${data.t}`);
  console.log('   Raw data:', JSON.stringify(data, null, 2));
  
  switch (data.t) {
    case 'HELLO':
      console.log('   🌟 HELLO received from server');
      console.log(`   Scene: ${data.sceneId}`);
      console.log(`   Version: ${data.version}`);
      console.log(`   Server Time: ${new Date(data.serverTime).toISOString()}`);
      
      // After receiving HELLO, try sending a chat message
      setTimeout(() => {
        console.log('\n   💬 Sending test chat message...');
        client.emit('evt', {
          t: 'CHAT',
          msg: 'Hello from debug client!'
        });
      }, 500);
      break;
      
    case 'PRESENCE':
      console.log('   👥 PRESENCE update received');
      console.log(`   Users online: ${data.users ? data.users.length : 0}`);
      if (data.users && data.users.length > 0) {
        data.users.forEach(user => {
          console.log(`      - ${user.name || 'Unknown'} (${user.userId})`);
        });
      }
      break;
      
    case 'CHAT':
      console.log('   💬 CHAT message received');
      console.log(`   From: ${data.from}`);
      console.log(`   Message: "${data.msg}"`);
      console.log(`   Timestamp: ${new Date(data.ts).toISOString()}`);
      break;
      
    case 'CAMERA':
      console.log('   📷 CAMERA update received');
      console.log(`   From: ${data.from}`);
      console.log(`   Position: [${data.pose.p.join(', ')}]`);
      console.log(`   Rotation: [${data.pose.q.join(', ')}]`);
      break;
      
    case 'PONG':
      const rtt = Date.now() - data.clientTs;
      console.log('   🏓 PONG received');
      console.log(`   RTT: ${rtt}ms`);
      console.log(`   Server Time: ${new Date(data.ts).toISOString()}`);
      break;
      
    case 'DELTA':
      console.log('   🔄 DELTA update received');
      console.log(`   Version: ${data.version}`);
      console.log(`   Operations: ${data.ops ? data.ops.length : 0}`);
      break;
      
    case 'JOB_STATUS':
      console.log('   ⚙️ JOB_STATUS received');
      console.log(`   Job ID: ${data.jobId}`);
      console.log(`   Status: ${data.status}`);
      break;
      
    default:
      console.log(`   ❓ Unknown event type: ${data.t}`);
  }
});

// Track socket state changes
client.on('connecting', () => {
  console.log('🔄 Connecting...');
});

client.on('reconnect', () => {
  console.log('🔄 Reconnected');
});

client.on('reconnect_attempt', () => {
  console.log('🔄 Reconnection attempt...');
});

client.on('reconnect_error', (error) => {
  console.log('❌ Reconnection error:', error.message);
});

client.on('reconnect_failed', () => {
  console.log('❌ Reconnection failed');
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down debug client...');
  if (client.connected) {
    client.disconnect();
  }
  process.exit(0);
});

// Keep alive and provide instructions
console.log('\n📋 Debug client is running...');
console.log('   - Watch for connection events above');
console.log('   - Press Ctrl+C to exit');
console.log('   - Check server logs for additional details\n');

// Set a timeout to close if nothing happens
setTimeout(() => {
  if (!client.connected) {
    console.log('\n⏰ No successful connection after 15 seconds, closing...');
    process.exit(1);
  }
}, 15000);