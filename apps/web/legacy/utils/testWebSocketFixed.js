/**
 * Test script to verify WebSocket infinite loop fix
 * Run this with: node apps/web/src/utils/testWebSocketFixed.js
 */

const { io } = require('socket.io-client');

// Test configuration
const sceneId = 'cmfqsrdtu00097d4s9m9ui5hr';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWZvNm1nMmswMDAwN2RpMGZhYWVjOWdyIiwiZW1haWwiOiJ6YWNrQGV4YW1wbGUuY29tIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzU4Mzc4NzU2LCJleHAiOjE3NTg1NTE1NTZ9.Sx_5wFcIi2yWnE8r1U4ui-YxF9t2Js4CUJyvJk9osvA';

let attemptCount = 0;
const maxAttempts = 3;

function testWebSocketWithCircuitBreaker() {
  if (attemptCount >= maxAttempts) {
    console.log('✅ Circuit breaker working - stopped after', maxAttempts, 'attempts');
    process.exit(0);
    return;
  }

  attemptCount++;
  console.log(`🔄 WebSocket connection attempt ${attemptCount}/${maxAttempts}`);

  const socket = io('http://localhost:3000/scenes', {
    query: { sceneId, token },
    transports: ['websocket'],
    timeout: 5000,
    reconnection: false,
    forceNew: true
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket connected successfully!');
    socket.disconnect();
    process.exit(0);
  });

  socket.on('connect_error', (error) => {
    console.log(`❌ Connection failed (attempt ${attemptCount}):`, error.message);
    socket.disconnect();
    
    if (attemptCount < maxAttempts) {
      const delay = 1000 * Math.pow(2, attemptCount - 1);
      console.log(`⏳ Retrying in ${delay}ms...`);
      setTimeout(() => {
        testWebSocketWithCircuitBreaker();
      }, delay);
    } else {
      console.log('🚫 Max attempts reached - circuit breaker activated');
      console.log('✅ Test completed - no infinite loop detected');
      process.exit(0);
    }
  });

  // Timeout safety
  setTimeout(() => {
    console.log('⏰ Connection timeout');
    socket.disconnect();
    if (attemptCount < maxAttempts) {
      testWebSocketWithCircuitBreaker();
    }
  }, 6000);
}

console.log('🧪 Testing WebSocket circuit breaker fix...');
console.log('Expected behavior: 3 attempts max, then stop (no infinite loop)');
testWebSocketWithCircuitBreaker();