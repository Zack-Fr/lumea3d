async function testFlatScenesCreate() {
  try {
    // First, get a valid JWT token by logging in
    console.log('🔐 Getting JWT token...');

    const loginResponse = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'farfar@example.com',
        password: 'password123'
      }),
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText} - ${errorText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.access_token || loginData.accessToken;

    if (!token) {
      console.error('❌ Login response:', JSON.stringify(loginData, null, 2));
      throw new Error('No access token in login response');
    }

    console.log('✅ Got JWT token');

    // Get user's projects to find a valid projectId
    console.log('📂 Getting user projects...');

    const projectsResponse = await fetch('http://localhost:3001/projects', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log(`Projects response status: ${projectsResponse.status}`);

    if (!projectsResponse.ok) {
      const errorText = await projectsResponse.text();
      console.error('❌ Failed to get projects!');
      console.error('Error response:', errorText);

      // Try to get user info instead
      console.log('🔍 Trying to get user info...');
      const userResponse = await fetch('http://localhost:3001/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('✅ User info:', JSON.stringify(userData, null, 2));
      } else {
        console.error('❌ Failed to get user info too');
      }

      throw new Error(`Failed to get projects: ${projectsResponse.status} ${projectsResponse.statusText}`);
    }

    const projectsData = await projectsResponse.json();
    console.log('✅ Projects data:', JSON.stringify(projectsData, null, 2));

    const projectId = projectsData[0]?.id;

    if (!projectId) {
      throw new Error('No projects found for user');
    }

    console.log(`✅ Found project: ${projectId}`);

    // Now test the flat scenes create endpoint
    console.log('🎨 Testing flat scenes create endpoint...');

    const createSceneResponse = await fetch('http://localhost:3001/scenes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Test Flat Scene',
        projectId: projectId,
        scale: 1.0,
        exposure: 1.0,
      }),
    });

    console.log(`Create scene response status: ${createSceneResponse.status}`);
    console.log(`Create scene response status text: ${createSceneResponse.statusText}`);

    if (createSceneResponse.ok) {
      const sceneData = await createSceneResponse.json();
      console.log('✅ Scene created successfully!');
      console.log('Scene data:', JSON.stringify(sceneData, null, 2));
    } else {
      const errorText = await createSceneResponse.text();
      console.error('❌ Scene creation failed!');
      console.error('Error response:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFlatScenesCreate();