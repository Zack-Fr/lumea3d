// Test script to make the exact same request that's failing
const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWY4Y3I1bDkwMDAwN2Rtd3Z6enhsanhpIiwiZW1haWwiOiJtb21vQGV4YW1wbGUuY29tIiwicm9sZSI6IkNMSUVOVCIsImlhdCI6MTc1NzM3OTM5NCwiZXhwIjoxNzU3NDEyMjU1fQ.GEMra1RdlE5ugjGHhZvhCuAZJDOtE01XsCJhpNwvzbA';

async function testDirectRequest() {
  try {
    console.log('Testing direct API request...');
    
    const response = await fetch('http://localhost:3001/scenes/cmfcdclnp00037dmc0seherag/categories', {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    
    const text = await response.text();
    console.log('Response body:', text);
    
    if (!response.ok) {
      console.log('❌ Request failed');
      
      // Check if it's CORS or actual auth issue
      console.log('Response headers:');
      for (const [key, value] of response.headers.entries()) {
        console.log(`  ${key}: ${value}`);
      }
    } else {
      console.log('✅ Request succeeded');
    }
    
  } catch (error) {
    console.error('❌ Request error:', error.message);
  }
}

testDirectRequest();