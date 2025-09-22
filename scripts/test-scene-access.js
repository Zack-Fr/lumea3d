// Test the scene access after fixing the service
async function testSceneAccess() {
  const baseUrl = 'http://localhost:3000/api';
  
  // You'll need to get a valid JWT token from your frontend or auth endpoint
  const token = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token
  
  const sceneId = 'cmf9g55vj00037dj0bf4r85dw'; // From our debug
  const projectId = 'cmf9g55uu00017dj01t8z4u11'; // From our debug
  
  try {
    console.log('Testing scene access endpoints...');
    
    // Test the legacy project-based route
    const response1 = await fetch(`${baseUrl}/projects/${projectId}/scenes`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`GET /projects/${projectId}/scenes: ${response1.status}`);
    if (response1.status === 401) {
      console.log('❌ Still 401 - check your JWT token');
    } else if (response1.status === 200) {
      console.log('✅ Success! Scenes endpoint now works');
    } else {
      console.log(`❓ Unexpected status: ${response1.status}`);
    }
    
  } catch (error) {
    console.error('Error testing:', error.message);
  }
}

console.log('To test:');
console.log('1. Get your JWT token from browser dev tools (localStorage or network tab)');
console.log('2. Replace YOUR_JWT_TOKEN_HERE in this file');
console.log('3. Run: node test-scene-access.js');

// Uncomment to run test:
// testSceneAccess();