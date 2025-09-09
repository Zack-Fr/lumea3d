const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function simpleAuthTest() {
  console.log('🔍 SIMPLE AUTHENTICATION TEST');
  console.log('==============================');
  
  // Wait a bit to avoid rate limits
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Try to login with momo (assuming it exists from previous test)
  try {
    console.log('Logging in with momo@example.com...');
    
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'momo@example.com',
      password: 'password123'
    });
    
    const authToken = loginResponse.data.token;
    const user = loginResponse.data.user;
    
    console.log('✅ Login successful!');
    console.log('User:', user.email, 'Role:', user.role);
    
    // Test the problematic scene ID that was causing your issue
    const problematicSceneId = 'cmfc8tjy200037dicvdbot30y';
    
    console.log(`\nTesting problematic scene: ${problematicSceneId}`);
    
    try {
      const sceneResponse = await axios.get(`${API_BASE_URL}/scenes/${problematicSceneId}/categories`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log('✅ Scene access successful!');
      console.log('Categories:', sceneResponse.data);
      
    } catch (sceneError) {
      console.log('❌ Scene access failed:', sceneError.response?.status, sceneError.response?.statusText);
      
      if (sceneError.response?.status === 404) {
        console.log('\n🎯 SOLUTION FOUND!');
        console.log('The scene ID "cmfc8tjy200037dicvdbot30y" does not exist in your database.');
        console.log('This is why your frontend is getting 401/404 errors and crashing.');
        console.log('\nTO FIX YOUR ISSUE:');
        console.log('1. Use a different scene ID that actually exists');
        console.log('2. Or create a new scene');
        console.log('3. Check what scenes are available in your projects');
        
        // Try to get user's projects to show available scenes
        try {
          const projectsResponse = await axios.get(`${API_BASE_URL}/projects`, {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          });
          
          console.log('\n📋 Available scenes in your projects:');
          projectsResponse.data.forEach(project => {
            if (project.scenes3D && project.scenes3D.length > 0) {
              project.scenes3D.forEach(scene => {
                console.log(`- Project: "${project.name}" → Scene: "${scene.name}" (ID: ${scene.id})`);
              });
            }
          });
          
        } catch (projectsError) {
          console.log('Could not retrieve projects:', projectsError.response?.data?.message);
        }
        
      } else if (sceneError.response?.status === 403) {
        console.log('\n🎯 PERMISSION ISSUE!');
        console.log('User lacks permission to access this scene.');
        
      } else {
        console.log('Error details:', sceneError.response?.data);
      }
    }
    
  } catch (loginError) {
    if (loginError.response?.status === 429) {
      console.log('❌ Rate limited. Wait a few minutes and try again.');
    } else {
      console.log('❌ Login failed:', loginError.response?.data?.message || loginError.message);
      
      // If momo doesn't exist, let's try default users
      console.log('\nTrying with other possible users...');
      
      const defaultUsers = [
        { email: 'admin@lumea.com', password: 'admin123' },
        { email: 'designer@lumea.com', password: 'designer123' },
        { email: 'client@lumea.com', password: 'client123' }
      ];
      
      for (const cred of defaultUsers) {
        try {
          console.log(`Trying ${cred.email}...`);
          const response = await axios.post(`${API_BASE_URL}/auth/login`, cred);
          console.log(`✅ ${cred.email} login successful!`);
          console.log(`Role: ${response.data.user.role}`);
          return; // Found working credentials
        } catch (error) {
          console.log(`❌ ${cred.email} failed`);
        }
      }
      
      console.log('\nNo default users work. You may need to register users first.');
    }
  }
}

simpleAuthTest();
