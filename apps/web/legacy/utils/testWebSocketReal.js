// Real WebSocket test with proper authentication
console.log('🔍 Testing WebSocket with real authentication...');

const testRealWebSocket = async () => {
  const http = require('http');
  const { io } = require('socket.io-client');

  // First, get a real JWT token by testing login
  console.log('🔑 Step 1: Testing authentication endpoint...');
  
  try {
    // Test if we can reach the auth endpoint
    const authReq = http.get('http://localhost:3000/auth/me', (res) => {
      console.log('📊 Auth endpoint status:', res.statusCode);
      
      if (res.statusCode === 401) {
        console.log('❌ Authentication required - need to login first');
        console.log('💡 Suggestion: Login to the app first to get a valid token');
        testWithoutAuth();
      } else {
        console.log('✅ Auth endpoint reachable');
      }
    }).on('error', (err) => {
      console.log('❌ Auth endpoint error:', err.message);
      testWithoutAuth();
    });

  } catch (error) {
    console.log('❌ Auth test failed:', error.message);
    testWithoutAuth();
  }
};

const testWithoutAuth = () => {
  console.log('\\n🔌 Step 2: Testing WebSocket without authentication (should fail gracefully)...');
  
  const socket = io('http://localhost:3000/scenes', {
    transports: ['websocket'],
    timeout: 3000,
    autoConnect: true
  });

  let hasResponse = false;
  
  const cleanup = setTimeout(() => {
    if (!hasResponse) {
      console.log('⏰ No response from WebSocket after 3 seconds');
      console.log('💡 This suggests the WebSocket server is not responding');
      socket.disconnect();
    }
  }, 3000);

  socket.on('connect', () => {
    hasResponse = true;
    clearTimeout(cleanup);
    console.log('✅ WebSocket connected without authentication!');
    console.log('📡 Socket ID:', socket.id);
    console.log('⚠️ This might indicate authentication is bypassed');
    
    socket.disconnect();
  });

  socket.on('connect_error', (error) => {
    hasResponse = true;
    clearTimeout(cleanup);
    console.log('❌ WebSocket connection failed (expected without auth):');
    console.log('   Message:', error.message);
    console.log('   Type:', error.type);
    
    if (error.message.includes('Missing sceneId or token')) {
      console.log('✅ Good! Authentication is working - missing credentials rejected');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('❌ WebSocket server not running or not accessible');
    } else {
      console.log('❓ Unexpected error type');
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected:', reason);
  });
};

testRealWebSocket();