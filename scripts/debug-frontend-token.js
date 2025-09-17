// Test frontend token directly against backend
console.log('🔍 Testing frontend token validation...');

async function testFrontendToken() {
  try {
    // Step 1: Get token from frontend auth process
    console.log('1. Getting token from frontend auth...');
    
    const loginResponse = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'farfar@example.com',
        password: 'password123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful, received:', {
      hasAccessToken: !!loginData.accessToken,
      hasRefreshToken: !!loginData.refreshToken
    });
    
    // Step 2: Get user profile (this combines into 'token' in frontend)
    console.log('\n2. Getting user profile with accessToken...');
    
    const profileResponse = await fetch('http://localhost:3001/auth/profile', {
      headers: {
        'Authorization': `Bearer ${loginData.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!profileResponse.ok) {
      throw new Error(`Profile failed: ${profileResponse.status}`);
    }
    
    const userData = await profileResponse.json();
    console.log('✅ Profile retrieved:', {
      id: userData.id,
      email: userData.email,
      role: userData.role
    });
    
    // Step 3: Test the problematic endpoint with exact same token
    console.log('\n3. Testing categories endpoint...');
    const sceneId = 'cmfcgp7lf00037du8w6mdv6o9';
    
    const categoriesResponse = await fetch(`http://localhost:3001/scenes/${sceneId}/categories`, {
      headers: {
        'Authorization': `Bearer ${loginData.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Categories response:', {
      status: categoriesResponse.status,
      statusText: categoriesResponse.statusText,
      ok: categoriesResponse.ok
    });
    
    if (categoriesResponse.ok) {
      const categoriesData = await categoriesResponse.json();
      console.log('✅ Categories success:', categoriesData.length || 0, 'items');
    } else {
      const errorText = await categoriesResponse.text();
      console.error('❌ Categories failed:', errorText);
      
      // Step 4: Test with fresh token
      console.log('\n4. Getting fresh token...');
      const freshLoginResponse = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'farfar@example.com',
          password: 'password123'
        })
      });
      
      const freshLoginData = await freshLoginResponse.json();
      
      console.log('🔄 Testing with fresh token...');
      const freshCategoriesResponse = await fetch(`http://localhost:3001/scenes/${sceneId}/categories`, {
        headers: {
          'Authorization': `Bearer ${freshLoginData.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 Fresh token result:', {
        status: freshCategoriesResponse.status,
        ok: freshCategoriesResponse.ok
      });
      
      if (freshCategoriesResponse.ok) {
        console.log('✅ Fresh token worked! Token expiry issue confirmed.');
      } else {
        const freshErrorText = await freshCategoriesResponse.text();
        console.error('❌ Fresh token also failed:', freshErrorText);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendToken();