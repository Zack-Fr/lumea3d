// Test the exact failing request from your error
const newToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWY4Y3I1bDkwMDAwN2Rtd3Z6enhsanhpIiwiZW1haWwiOiJtb21vQGV4YW1wbGUuY29tIiwicm9sZSI6IkNMSUVOVCIsImlhdCI6MTc1NzQxMTk0MywiZXhwIjoxNzU3NDEyODQzfQ.qkFkiek5VLNoReYsFpdrK8GbLwQXbevxEvuH9QK76hY';

async function testExactFailingRequest() {
  try {
    // Test the exact scene from your error
    const sceneId = 'cmfcdulpf00037d9cdo9b6g5o';
    
    console.log('Testing exact failing request...');
    console.log(`Scene ID: ${sceneId}`);
    
    // Test direct API call (like frontend is making)
    const response1 = await fetch(`http://localhost:3001/scenes/${sceneId}/categories`, {
      headers: {
        'Authorization': `Bearer ${newToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Direct API Status: ${response1.status}`);
    
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ Direct API request successful:', data1);
    } else {
      const error1 = await response1.text();
      console.log('❌ Direct API request failed:', error1);
    }
    
    // Test if the scene exists first
    console.log('\\nChecking if scene exists...');
    const sceneCheck = await fetch(`http://localhost:3001/scenes/${sceneId}`, {
      headers: {
        'Authorization': `Bearer ${newToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Scene check status: ${sceneCheck.status}`);
    if (!sceneCheck.ok) {
      const sceneError = await sceneCheck.text();
      console.log('Scene error:', sceneError);
    }
    
  } catch (error) {
    console.error('❌ Request error:', error.message);
  }
}

testExactFailingRequest();