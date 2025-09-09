// Debug frontend authentication flow
console.log('🔍 Testing frontend authentication flow...');

const API_BASE_URL = 'http://localhost:3001';

async function testFrontendAuth() {
  try {
    // Step 1: Login
    console.log('1. Testing login...');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'farfar@example.com',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login response structure:', {
      hasUser: !!loginData.user,
      hasAccessToken: !!loginData.accessToken,
      hasToken: !!loginData.token,
      hasRefreshToken: !!loginData.refreshToken,
      userRole: loginData.user?.role,
      userId: loginData.user?.id
    });

    // Get the token that frontend should use
    const frontendToken = loginData.token || loginData.accessToken;
    console.log('🔑 Frontend should use token:', frontendToken ? 'YES' : 'NO');

    if (!frontendToken) {
      console.error('❌ No token available for frontend!');
      return;
    }

    // Step 2: Test scene categories endpoint (the failing one)
    console.log('\n2. Testing scene categories with frontend token...');
    const sceneId = 'cmfcgp7lf00037du8w6mdv6o9'; // From the error message
    const categoriesResponse = await fetch(`${API_BASE_URL}/scenes/${sceneId}/categories`, {
      headers: {
        'Authorization': `Bearer ${frontendToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Categories response status:', categoriesResponse.status);
    
    if (categoriesResponse.ok) {
      const categoriesData = await categoriesResponse.json();
      console.log('✅ Categories retrieved successfully:', categoriesData.length || 0, 'categories');
    } else {
      console.error('❌ Categories request failed:', await categoriesResponse.text());
    }

    // Step 3: Test projects endpoint
    console.log('\n3. Testing projects endpoint...');
    const projectsResponse = await fetch(`${API_BASE_URL}/projects`, {
      headers: {
        'Authorization': `Bearer ${frontendToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📁 Projects response status:', projectsResponse.status);
    
    if (projectsResponse.ok) {
      const projectsData = await projectsResponse.json();
      console.log('✅ Projects retrieved successfully:', projectsData.length || 0, 'projects');
    } else {
      console.error('❌ Projects request failed:', await projectsResponse.text());
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendAuth();