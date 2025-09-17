const { io } = require('socket.io-client');

console.log('🔌 Testing basic WebSocket connection...');

const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],
  timeout: 10000,
  forceNew: true
});

socket.on('connect', () => {
  console.log('✅ Connected to main namespace!');
  console.log('Socket ID:', socket.id);
  
  // Test scenes namespace
  console.log('🎬 Connecting to scenes namespace...');
  const scenesSocket = io('http://localhost:3000/scenes', {
    transports: ['websocket', 'polling'],
    timeout: 10000,
    forceNew: true
  });
  
  scenesSocket.on('connect', () => {
    console.log('✅ Connected to scenes namespace!');
    console.log('Scenes Socket ID:', scenesSocket.id);
    
    setTimeout(() => {
      console.log('✅ WebSocket test completed successfully!');
      scenesSocket.disconnect();
      socket.disconnect();
      process.exit(0);
    }, 2000);
  });
  
  scenesSocket.on('connect_error', (error) => {
    console.error('❌ Scenes namespace connection error:', error.message);
    socket.disconnect();
    process.exit(1);
  });
  
  scenesSocket.on('connected', (data) => {
    console.log('✅ Scenes namespace acknowledged:', data);
  });
});

socket.on('connect_error', (error) => {
  console.error('❌ Main connection error:', error.message);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.error('❌ Connection timeout');
  socket.disconnect();
  process.exit(1);
}, 15000);