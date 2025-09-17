const { io } = require('socket.io-client');

// Configuration
const API_URL = 'http://localhost:3000';
let socket = null;

// Test credentials (from our seeded data)
const testCredentials = {
  email: 'designer@lumea.com',
  password: 'designer123'
};

let authToken = null;
let testProjectId = null;
let testSceneId = null;

async function authenticateUser() {
  try {
    const fetch = (await import('node-fetch')).default;
    
    console.log('🔐 Authenticating user...');
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCredentials),
    });
    
    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }
    
    const data = await response.json();
    authToken = data.accessToken;
    console.log('✅ Authentication successful');
    return data;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    throw error;
  }
}

async function getTestProject() {
  try {
    const fetch = (await import('node-fetch')).default;
    
    console.log('📂 Using demo test data...');
    
    // Get user info first
    const userResponse = await fetch(`${API_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!userResponse.ok) {
      throw new Error('Failed to get user profile');
    }
    
    const user = await userResponse.json();
    console.log('👤 User info retrieved:', user.email);
    
    // Use demo project and scene data from seed
    testProjectId = 'demo-project';
    testSceneId = 'demo-scene-3d'; // Use the 3D scene for WebSocket testing
    
    console.log('🏠 Test project ID:', testProjectId);
    console.log('🎬 Test scene ID:', testSceneId);
    
    return { projectId: testProjectId, sceneId: testSceneId };
  } catch (error) {
    console.error('❌ Failed to get test project:', error.message);
    throw error;
  }
}

function setupSocketEvents() {
  socket.on('connect', () => {
    console.log('🔌 Connected to WebSocket server');
    console.log('Socket ID:', socket.id);
  });

  socket.on('connected', (data) => {
    console.log('✅ Server acknowledged connection:', data);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected from WebSocket server:', reason);
  });

  socket.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });

  socket.on('sceneJoined', (data) => {
    console.log('🎬 Successfully joined scene:', data);
  });

  socket.on('userJoined', (data) => {
    console.log('👥 User joined scene:', data);
  });

  socket.on('userLeft', (data) => {
    console.log('👋 User left scene:', data);
  });

  socket.on('operationReceived', (data) => {
    console.log('⚡ Operation received:', data);
  });

  socket.on('sceneDelta', (data) => {
    console.log('🔄 Scene delta received:', data);
  });

  socket.on('syncResponse', (data) => {
    console.log('🔄 Sync response:', data);
  });
}

async function testWebSocketFunctionality() {
  try {
    // Step 1: Authenticate
    await authenticateUser();
    
    // Step 2: Get test project
    await getTestProject();
    
    // Step 4: Connect to WebSocket with authentication
    console.log('🔌 Connecting to WebSocket...');
    
    // Create socket with authentication token
    socket = io(`${API_URL}/scenes`, {
      transports: ['websocket'],
      timeout: 10000,
      auth: {
        token: authToken
      },
      extraHeaders: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    // Setup socket events after creating the socket
    setupSocketEvents();
    
    // Wait for connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);
      
      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    // Step 5: Test joining a scene (authentication happens automatically with guard)
    console.log('🎬 Testing scene join...');
    
    socket.emit('joinScene', {
      projectId: testProjectId,
      sceneId: testSceneId,
    });
    
    // Wait a bit for responses
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 6: Test scene operations
    console.log('⚡ Testing scene operations...');
    
    socket.emit('sceneOperation', {
      type: 'add',
      target: 'item',
      id: 'test-item-' + Date.now(),
      data: {
        position: { x: 100, y: 200, z: 50 },
        rotation: { x: 0, y: 45, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        categoryKey: 'furniture',
      },
    });
    
    // Step 7: Test sync request
    console.log('🔄 Testing sync request...');
    
    socket.emit('requestSync', {
      version: 1,
    });
    
    // Wait for responses
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 8: Test leaving scene
    console.log('👋 Testing scene leave...');
    socket.emit('leaveScene');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ WebSocket functionality test completed successfully!');
    
  } catch (error) {
    console.error('❌ WebSocket test failed:', error.message);
  } finally {
    socket.disconnect();
    process.exit(0);
  }
}

// Run the test
console.log('🚀 Starting WebSocket functionality test...');
testWebSocketFunctionality();