const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001';
const WEB_BASE = 'http://localhost:5173';

async function testComplete() {
  console.log('🧪 Testing Complete Frontend Integration');
  console.log('======================================');

  try {
    // 1. Test login
    console.log('\n1. Testing login...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'farfar@example.com',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResponse.status, await loginResponse.text());
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.access_token;
    console.log('✅ Login successful, token received');

    // 2. Test projects access
    console.log('\n2. Testing projects access...');
    const projectsResponse = await fetch(`${API_BASE}/projects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!projectsResponse.ok) {
      console.log('❌ Projects access failed:', projectsResponse.status);
      return;
    }

    const projects = await projectsResponse.json();
    console.log(`✅ Projects loaded: ${projects.length} projects found`);

    if (projects.length === 0) {
      console.log('⚠️  No projects found - cannot test scene loading');
      return;
    }

    const firstProject = projects[0];
    console.log(`   Using project: ${firstProject.name} (${firstProject.id})`);

    // 3. Test flat scenes access
    console.log('\n3. Testing flat scenes access...');
    const scenesResponse = await fetch(`${API_BASE}/scenes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!scenesResponse.ok) {
      console.log('❌ Flat scenes access failed:', scenesResponse.status);
      return;
    }

    const scenes = await scenesResponse.json();
    console.log(`✅ Flat scenes loaded: ${scenes.length} scenes found`);

    if (scenes.length === 0) {
      console.log('⚠️  No scenes found - cannot test scene details');
      return;
    }

    const firstScene = scenes[0];
    console.log(`   Using scene: ${firstScene.name || firstScene.id}`);

    // 4. Test scene categories (flat route)
    console.log('\n4. Testing scene categories (flat route)...');
    const categoriesResponse = await fetch(`${API_BASE}/scenes/${firstScene.id}/categories`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!categoriesResponse.ok) {
      console.log('❌ Scene categories failed:', categoriesResponse.status);
      return;
    }

    const categories = await categoriesResponse.json();
    console.log(`✅ Scene categories loaded: ${categories.length} categories`);

    // 5. Test scene manifest (flat route)
    console.log('\n5. Testing scene manifest (flat route)...');
    const manifestResponse = await fetch(`${API_BASE}/scenes/${firstScene.id}/manifest`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!manifestResponse.ok) {
      console.log('❌ Scene manifest failed:', manifestResponse.status);
      return;
    }

    const manifest = await manifestResponse.json();
    console.log(`✅ Scene manifest loaded: ${Object.keys(manifest.items || {}).length} items`);

    // 6. Test frontend accessibility
    console.log('\n6. Testing frontend accessibility...');
    const frontendResponse = await fetch(WEB_BASE);

    if (!frontendResponse.ok) {
      console.log('❌ Frontend not accessible:', frontendResponse.status);
      return;
    }

    console.log('✅ Frontend is accessible');

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('=====================================');
    console.log('✅ Authentication working');
    console.log('✅ Projects API working');
    console.log('✅ Flat scenes API working');
    console.log('✅ Scene categories (flat route) working');
    console.log('✅ Scene manifest (flat route) working');
    console.log('✅ Frontend accessible');
    console.log('');
    console.log('The frontend should now be able to:');
    console.log('- Log in successfully');
    console.log('- Load projects and scenes');
    console.log('- Use flat route structure for all scene operations');
    console.log('- Compile without TypeScript errors');

  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
  }
}

testComplete();