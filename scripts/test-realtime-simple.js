#!/usr/bin/env node

/**
 * Simple test for realtime connections - WebSocket and SSE
 * Tests both connection methods with token authentication
 */

const io = require('socket.io-client');
const EventSource = require('eventsource');

const API_BASE_URL = 'http://localhost:3001';
const TEST_SCENE_ID = 'test-scene-123';
const TEST_TOKEN = 'test-token-123'; // Replace with actual token

async function testWebSocket() {
  console.log('\n🔌 Testing WebSocket Connection...');
  
  return new Promise((resolve, reject) => {
    const socket = io(`${API_BASE_URL}/scenes`, {
      query: { sceneId: TEST_SCENE_ID },
      auth: { token: TEST_TOKEN },
      transports: ['websocket'],
      timeout: 5000
    });
    
    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error('WebSocket connection timeout'));
    }, 10000);
    
    socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
      clearTimeout(timeout);
      socket.disconnect();
      resolve('WebSocket working');
    });
    
    socket.on('connect_error', (error) => {
      console.log('❌ WebSocket connection failed:', error.message);
      clearTimeout(timeout);
      reject(error);
    });
    
    socket.on('scene:delta', (data) => {
      console.log('📨 Received WebSocket delta:', data);
    });
  });
}

async function testSSE() {
  console.log('\n📡 Testing SSE Connection...');
  
  return new Promise((resolve, reject) => {
    const url = `${API_BASE_URL}/scenes/${TEST_SCENE_ID}/events?token=${encodeURIComponent(TEST_TOKEN)}`;
    const eventSource = new EventSource(url);
    
    const timeout = setTimeout(() => {
      eventSource.close();
      reject(new Error('SSE connection timeout'));
    }, 10000);
    
    eventSource.onopen = () => {
      console.log('✅ SSE connected successfully');
      clearTimeout(timeout);
      eventSource.close();
      resolve('SSE working');
    };
    
    eventSource.onerror = (error) => {
      console.log('❌ SSE connection failed:', error);
      clearTimeout(timeout);
      eventSource.close();
      reject(error);
    };
    
    eventSource.onmessage = (event) => {
      console.log('📨 Received SSE message:', event.data);
    };
  });
}

async function main() {
  console.log('🚀 Testing Realtime Connections');
  console.log(`API: ${API_BASE_URL}`);
  console.log(`Scene: ${TEST_SCENE_ID}`);
  console.log(`Token: ${TEST_TOKEN.substring(0, 10)}...`);
  
  try {
    // Test WebSocket first
    await testWebSocket();
  } catch (error) {
    console.log('⚠️  WebSocket test failed, this is expected if server is not running');
  }
  
  try {
    // Test SSE as fallback
    await testSSE();
  } catch (error) {
    console.log('⚠️  SSE test failed, this is expected if server is not running');
  }
  
  console.log('\n✅ Realtime connection tests completed');
  console.log('Note: Install socket.io-client and eventsource packages to run this test');
  console.log('Run: npm install socket.io-client eventsource');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testWebSocket, testSSE };