// Test exact frontend authentication flow
console.log('🔍 Testing exact frontend authentication flow...');

const API_BASE_URL = 'http://localhost:3001';

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  console.log(`🌐 Making request to: ${url}`);
  
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Request failed with ${response.status}:`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Request error:', error.message);
    throw error;
  }
}

async function testFrontendAuthFlow() {
  try {
    console.log('\n1. Step 1: Login to get tokens...');
    const tokensResponse = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'farfar@example.com',
        password: 'password123'
      }),
    });
    
    console.log('✅ Tokens received:', {
      hasAccessToken: !!tokensResponse.accessToken,
      hasRefreshToken: !!tokensResponse.refreshToken
    });

    console.log('\n2. Step 2: Get user profile...');
    const userResponse = await apiRequest('/auth/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokensResponse.accessToken}`,
      },
    });
    
    console.log('✅ User profile received:', {
      id: userResponse.id,
      email: userResponse.email,
      role: userResponse.role
    });

    console.log('\n3. Step 3: Combine into expected format...');
    const response = {
      user: userResponse,
      token: tokensResponse.accessToken,
      refreshToken: tokensResponse.refreshToken
    };
    
    console.log('✅ Combined response:', {
      hasUser: !!response.user,
      hasToken: !!response.token,
      hasRefreshToken: !!response.refreshToken,
      userId: response.user?.id,
      userRole: response.user?.role
    });

    console.log('\n4. Step 4: Test scene access with combined token...');
    const sceneId = 'cmfcgp7lf00037du8w6mdv6o9';
    const categoriesResponse = await apiRequest(`/scenes/${sceneId}/categories`, {
      headers: {
        Authorization: `Bearer ${response.token}`,
      },
    });
    
    console.log('✅ Scene categories retrieved successfully:', categoriesResponse.length || 0, 'categories');
    
    console.log('\n🎉 Frontend authentication flow should work perfectly!');
    
  } catch (error) {
    console.error('❌ Frontend auth flow failed:', error.message);
  }
}

testFrontendAuthFlow();