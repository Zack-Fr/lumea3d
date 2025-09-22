// Test WebSocket connection to backend
const testWebSocketConnection = async () => {
  console.log('🔌 Testing WebSocket connection to backend...');
  
  try {
    // Test basic HTTP connection first
    const response = await fetch('http://localhost:3000/health');
    if (response.ok) {
      console.log('✅ Backend HTTP server is reachable');
    } else {
      console.log('❌ Backend HTTP server returned:', response.status);
      return;
    }
  } catch (error) {
    console.log('❌ Backend HTTP server not reachable:', error.message);
    return;
  }

  // Test WebSocket connection
  const { io } = require('socket.io-client');
  
  const socket = io('http://localhost:3000/scenes', {
    transports: ['websocket'],
    timeout: 5000,
    query: { 
      sceneId: 'test-scene',
      token: 'test-token'
    }
  });

  let connectionTimeout = setTimeout(() => {
    console.log('⏰ WebSocket connection timeout');
    socket.disconnect();
  }, 10000);

  socket.on('connect', () => {
    clearTimeout(connectionTimeout);
    console.log('✅ WebSocket connected successfully!');
    console.log('📡 Socket ID:', socket.id);
    console.log('🔗 Transport:', socket.io.engine.transport.name);
    
    // Test basic events
    socket.emit('joinScene', { projectId: 'test-project', sceneId: 'test-scene' });
    
    setTimeout(() => {
      socket.disconnect();
      console.log('🔌 Test completed - disconnecting');
    }, 2000);
  });

  socket.on('connect_error', (error) => {
    clearTimeout(connectionTimeout);
    console.log('❌ WebSocket connection failed:');
    console.log('   Error type:', error.type);
    console.log('   Error message:', error.message);
    console.log('   Error description:', error.description);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 WebSocket disconnected:', reason);
  });

  socket.on('sceneJoined', (data) => {
    console.log('🎯 Scene joined successfully:', data);
  });

  socket.on('error', (error) => {
    console.log('❌ WebSocket error:', error);
  });
};

// Run the test
if (typeof window === 'undefined') {
  // Node.js environment
  testWebSocketConnection();
} else {
  // Browser environment
  console.log('WebSocket test script loaded. Call testWebSocketConnection() to run.');
  window.testWebSocketConnection = testWebSocketConnection;
}