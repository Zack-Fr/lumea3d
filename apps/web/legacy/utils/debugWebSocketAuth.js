// Debug the WebSocket authentication issue
console.log('🔍 Debugging WebSocket + JWT authentication...');

// This script should be run from browser console when logged into the app
if (typeof window !== 'undefined') {
  window.debugWebSocketAuth = async () => {
    console.log('🔑 Step 1: Check if user is logged in...');
    
    // Try to get current user info
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const user = await response.json();
        console.log('✅ User is logged in:', user);
        
        // Try to get JWT token from localStorage or session
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (token) {
          console.log('✅ Found auth token:', token.substring(0, 20) + '...');
          testWebSocketWithToken(token, user);
        } else {
          console.log('❌ No auth token found in storage');
          console.log('💡 Check if token is stored differently or try logging in again');
        }
      } else {
        console.log('❌ User not logged in:', response.status);
        console.log('💡 Please log in to the app first');
      }
    } catch (error) {
      console.log('❌ Error checking login status:', error);
    }
  };

  const testWebSocketWithToken = (token, user) => {
    console.log('\\n🔌 Step 2: Test WebSocket with real token...');
    
    // Get a real scene ID from the current page or use a test one
    const sceneId = window.location.pathname.includes('/editor/') 
      ? window.location.pathname.split('/').pop()
      : 'test-scene-id';
    
    console.log('🎯 Using scene ID:', sceneId);
    
    const { io } = require('socket.io-client');
    
    const socket = io('/scenes', {
      query: { sceneId, token },
      transports: ['websocket'],
      timeout: 5000,
      forceNew: true
    });

    let connected = false;

    socket.on('connect', () => {
      connected = true;
      console.log('✅ WebSocket connected with JWT!');
      console.log('📡 Socket ID:', socket.id);
      
      // Try to join the scene
      socket.emit('joinScene', { projectId: 'current-project', sceneId });
      console.log('📤 Sent joinScene event');
      
      setTimeout(() => {
        socket.disconnect();
        console.log('✅ WebSocket JWT test completed successfully');
      }, 2000);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ WebSocket JWT test failed:');
      console.log('   Message:', error.message);
      console.log('   Details:', error);
      
      if (error.message.includes('Missing sceneId or token')) {
        console.log('💡 Token not passed correctly');
      } else if (error.message.includes('Scene not found')) {
        console.log('💡 Scene does not exist - try with a real scene ID');
      } else if (error.message.includes('Insufficient permissions')) {
        console.log('💡 User does not have access to this scene');
      } else {
        console.log('💡 Other authentication issue');
      }
    });

    socket.on('sceneJoined', (data) => {
      console.log('🎯 Scene joined successfully!', data);
    });

    socket.on('error', (error) => {
      console.log('❌ Socket error:', error);
    });

    setTimeout(() => {
      if (!connected) {
        console.log('⏰ Connection timeout - check backend logs');
        socket.disconnect();
      }
    }, 5000);
  };

  console.log('💡 Run debugWebSocketAuth() in the browser console when logged into the app');
} else {
  console.log('❌ This script should be run in the browser console');
}