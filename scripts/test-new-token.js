// Test getting a fresh JWT token
async function getNewToken() {
  try {
    console.log('Getting new JWT token...');
    
    const response = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'momo@example.com',
        password: 'password123' // momo's actual password
      })
    });
    
    console.log(`Login Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Login successful');
      console.log('New JWT token:', data.accessToken);
      
      // Test the new token immediately
      console.log('\\nTesting new token...');
      const testResponse = await fetch('http://localhost:3001/scenes/cmfcdclnp00037dmc0seherag/categories', {
        headers: {
          'Authorization': `Bearer ${data.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Test Status: ${testResponse.status}`);
      if (testResponse.ok) {
        const categories = await testResponse.json();
        console.log('✅ Categories request successful:', categories);
      } else {
        const error = await testResponse.text();
        console.log('❌ Categories request failed:', error);
      }
      
    } else {
      const error = await response.text();
      console.log('❌ Login failed:', error);
      console.log('You need to:');
      console.log('1. Replace "your-password-here" with momo\'s actual password');
      console.log('2. Or create the user if it doesn\'t exist');
    }
    
  } catch (error) {
    console.error('❌ Request error:', error.message);
  }
}

getNewToken();