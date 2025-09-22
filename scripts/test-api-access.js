const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testApiAccess() {
  try {
    console.log('🔍 TESTING API ACCESS');
    console.log('====================');
    
    // First, try to login with demo credentials
    const loginCredentials = [
      { email: 'client@lumea.com', password: 'client123' },
      { email: 'designer@lumea.com', password: 'designer123' },
      { email: 'admin@lumea.com', password: 'admin123' },
      { email: 'momo@example.com', password: 'password123' }, // Try momo if it exists
    ];
    
    let authToken = null;
    let user = null;
    
    console.log('\n1️⃣ TRYING TO LOGIN:');
    
    for (const creds of loginCredentials) {
      try {
        console.log(`Trying login with: ${creds.email}`);
        const response = await axios.post(`${API_BASE_URL}/auth/login`, creds);
        
        if (response.data && response.data.token) {
          authToken = response.data.token;
          user = response.data.user;
          console.log(`✅ Login successful with: ${creds.email}`);
          console.log(`User role: ${user.role}`);
          console.log(`Token: ${authToken.substring(0, 20)}...`);
          break;
        }
      } catch (error) {
        console.log(`❌ Login failed for ${creds.email}: ${error.response?.data?.message || error.message}`);
      }
    }
    
    if (!authToken) {
      console.log('\n❌ Could not authenticate with any credentials');
      console.log('Available endpoints to check:');
      
      try {
        const docsResponse = await axios.get(`${API_BASE_URL}/docs-json`);
        console.log('✅ API is running - got OpenAPI spec');
      } catch (error) {
        console.log('❌ Cannot access API docs:', error.message);
      }
      
      return;
    }
    
    console.log('\n2️⃣ TESTING SCENE ACCESS:');
    
    // Test the problematic scene endpoint
    const sceneId = 'cmfc8tjy200037dicvdbot30y';
    
    try {
      const response = await axios.get(`${API_BASE_URL}/scenes/${sceneId}/categories`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log('✅ Scene access successful!');
      console.log('Categories:', response.data);
      
    } catch (error) {
      console.log(`❌ Scene access failed: ${error.response?.status} ${error.response?.statusText}`);
      console.log('Error:', error.response?.data);
      
      if (error.response?.status === 404) {
        console.log('\n🎯 SCENE NOT FOUND - Lets check what scenes exist:');
        
        try {
          // Try to get a list of projects first
          const projectsResponse = await axios.get(`${API_BASE_URL}/projects`, {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          });
          
          console.log('Available projects:');
          console.table(projectsResponse.data.map(p => ({
            id: p.id,
            name: p.name,
            scenesCount: p.scenes3D?.length || 0
          })));
          
          // Try to access scenes in the first project
          if (projectsResponse.data.length > 0) {
            const firstProject = projectsResponse.data[0];
            if (firstProject.scenes3D && firstProject.scenes3D.length > 0) {
              const firstSceneId = firstProject.scenes3D[0].id;
              console.log(`\n3️⃣ TESTING WITH EXISTING SCENE: ${firstSceneId}`);
              
              const sceneResponse = await axios.get(`${API_BASE_URL}/scenes/${firstSceneId}/categories`, {
                headers: {
                  'Authorization': `Bearer ${authToken}`
                }
              });
              
              console.log('✅ Existing scene access successful!');
              console.log('Categories:', sceneResponse.data);
            }
          }
          
        } catch (projectError) {
          console.log('❌ Cannot access projects:', projectError.response?.data || projectError.message);
        }
      }
    }
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testApiAccess();
