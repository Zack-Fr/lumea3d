#!/usr/bin/env node

/**
 * Simple Realtime Test Client
 * Tests WebSocket connections to your Lumea realtime system
 */

const { io } = require('socket.io-client');

// Configuration
const SERVER_URL = 'http://localhost:3001';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwibmFtZSI6IlRlc3QgVXNlciIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTc1Nzg3MzM4MiwiZXhwIjoxNzU3OTU5NzgyfQ.32_CeWR8wBXQyiUPqL2xMTM0aKjADZ_3RdPn8GfSjZ4';
const SCENE_ID = 'test-scene-123'; // Valid scene ID from database

console.log('🚀 Starting Realtime Test Client');
console.log(`Server: ${SERVER_URL}`);
console.log(`Scene: ${SCENE_ID}`);
console.log(`Token: ${JWT_TOKEN.substring(0, 20)}...`);

// Create WebSocket client
const client = io(`${SERVER_URL}/rt`, {
  query: {
    token: JWT_TOKEN,
    sceneId: SCENE_ID,
  },
  transports: ['websocket'],
  forceNew: true,
});

// Connection handlers
client.on('connect', () => {
  console.log('✅ Connected to realtime server!');
  console.log(`Connection ID: ${client.id}`);
  
  // Test sending a chat message after 2 seconds
  setTimeout(() => {
    console.log('💬 Sending test chat message...');
    client.emit('evt', {
      t: 'CHAT',
      msg: 'Hello from test client!'
    });
  }, 2000);
  
  // Test sending camera update after 4 seconds
  setTimeout(() => {
    console.log('📷 Sending test camera update...');
    client.emit('evt', {
      t: 'CAMERA',
      pose: {
        p: [1.0, 2.0, 3.0],
        q: [0.0, 0.0, 0.0, 1.0]
      }
    });
  }, 4000);
  
  // Test ping after 6 seconds
  setTimeout(() => {
    console.log('🏓 Sending ping...');
    client.emit('evt', {
      t: 'PING',
      ts: Date.now()
    });
  }, 6000);
});

client.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
});

client.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

// Message handlers
client.on('evt', (data) => {
  console.log(`📨 Received event: ${data.t}`);
  
  switch (data.t) {
    case 'HELLO':
      console.log(`   🌟 HELLO from server`);
      console.log(`   Scene: ${data.sceneId}`);
      console.log(`   Version: ${data.version}`);
      console.log(`   Server Time: ${new Date(data.serverTime).toISOString()}`);
      break;
      
    case 'PRESENCE':
      console.log(`   👥 PRESENCE update: ${data.users.length} users online`);
      data.users.forEach(user => {
        console.log(`      - ${user.name} (${user.userId})`);
      });
      break;
      
    case 'CHAT':
      console.log(`   💬 CHAT from ${data.from}: "${data.msg}"`);
      console.log(`   Time: ${new Date(data.ts).toISOString()}`);
      break;
      
    case 'CAMERA':
      console.log(`   📷 CAMERA update from ${data.from}`);
      console.log(`   Position: [${data.pose.p.join(', ')}]`);
      console.log(`   Rotation: [${data.pose.q.join(', ')}]`);
      break;
      
    case 'PONG':
      const rtt = Date.now() - data.clientTs;
      console.log(`   🏓 PONG received - RTT: ${rtt}ms`);
      console.log(`   Server Time: ${new Date(data.ts).toISOString()}`);
      break;
      
    case 'DELTA':
      console.log(`   🔄 DELTA update - Version: ${data.version}`);
      console.log(`   Operations: ${data.ops.length}`);
      break;
      
    case 'JOB_STATUS':
      console.log(`   ⚙️ JOB_STATUS: ${data.jobId} - ${data.status}`);
      break;
      
    default:
      console.log(`   ❓ Unknown event type: ${data.t}`);
      console.log(`   Data:`, JSON.stringify(data, null, 2));
  }
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down test client...');
  client.disconnect();
  process.exit(0);
});

// Keep alive
console.log('\nListening for realtime events... (Press Ctrl+C to exit)');