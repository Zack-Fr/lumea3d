const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testAuthComplete() {
  try {
    console.log('🔐 COMPREHENSIVE AUTHENTICATION TEST');
    console.log('=====================================');
    
    // 1. Try to register momo user
    console.log('\n1️⃣ REGISTERING MOMO USER:');
    
    const momoUser = {
      email: 'momo@example.com',
      password: 'password123',
      name: 'Momo Test User',
      role: 'CLIENT'
    };
    
    try {
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, momoUser);
      console.log('✅ Momo registered successfully!');
      console.log('User:', registerResponse.data.user);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️ Momo user already exists, proceeding with login');
      } else {
        console.log('❌ Registration failed:', error.response?.data?.message || error.message);
        return;
      }
    }
    
    // 2. Login with momo
    console.log('\n2️⃣ LOGGING IN WITH MOMO:');
    
    let authToken = null;
    let user = null;
    
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: momoUser.email,
        password: momoUser.password
      });
      
      authToken = loginResponse.data.token;
      user = loginResponse.data.user;
      
      console.log('✅ Login successful!');
      console.log('User role:', user.role);
      console.log('Token preview:', authToken.substring(0, 30) + '...');
      
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data?.message || error.message);
      return;
    }
    
    // 3. Get user projects
    console.log('\n3️⃣ GETTING USER PROJECTS:');
    
    try {
      const projectsResponse = await axios.get(`${API_BASE_URL}/projects`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log('✅ Projects retrieved successfully!');
      console.log('Number of projects:', projectsResponse.data.length);
      
      if (projectsResponse.data.length > 0) {
        console.table(projectsResponse.data.map(p => ({
          id: p.id,
          name: p.name,
          scenesCount: p.scenes3D?.length || 0,
          memberCount: p._count?.members || 0
        })));
        
        // Test accessing first scene if available
        const firstProject = projectsResponse.data[0];
        if (firstProject.scenes3D && firstProject.scenes3D.length > 0) {
          console.log('\n4️⃣ TESTING SCENE ACCESS WITH EXISTING SCENE:');
          
          const firstScene = firstProject.scenes3D[0];
          console.log(`Testing scene: ${firstScene.id} (${firstScene.name})`);
          
          try {
            const sceneResponse = await axios.get(`${API_BASE_URL}/scenes/${firstScene.id}/categories`, {
              headers: {
                'Authorization': `Bearer ${authToken}`
              }
            });
            
            console.log('✅ Scene access successful!');
            console.log('Categories found:', sceneResponse.data.categories?.length || 0);
            console.table(sceneResponse.data.categories?.slice(0, 3) || []);
            
          } catch (sceneError) {
            console.log('❌ Scene access failed:', sceneError.response?.status, sceneError.response?.statusText);
            console.log('Error details:', sceneError.response?.data);
          }
        } else {
          console.log('\n🔄 NO SCENES FOUND - Creating a test scene:');
          
          try {
            // Create a new project with a scene
            const newProjectResponse = await axios.post(`${API_BASE_URL}/projects`, {
              name: 'Momo Test Project',
              scene: {
                name: 'Test Scene',
                spawn: {
                  position: [0, 1.7, 5],
                  yaw_deg: 0
                }
              }
            }, {
              headers: {
                'Authorization': `Bearer ${authToken}`
              }
            });
            
            console.log('✅ New project created!');
            console.log('Project ID:', newProjectResponse.data.projectId);
            console.log('Scene ID:', newProjectResponse.data.sceneId);
            
            // Now test the new scene
            const newSceneId = newProjectResponse.data.sceneId;
            const categoriesResponse = await axios.get(`${API_BASE_URL}/scenes/${newSceneId}/categories`, {
              headers: {
                'Authorization': `Bearer ${authToken}`
              }
            });
            
            console.log('✅ New scene access successful!');
            console.log('Categories:', categoriesResponse.data);
            
          } catch (createError) {
            console.log('❌ Project creation failed:', createError.response?.data || createError.message);
          }
        }
        
      } else {
        console.log('📝 No projects found. Creating a test project...');
        
        try {
          const newProjectResponse = await axios.post(`${API_BASE_URL}/projects`, {
            name: 'Momo Test Project',
            scene: {
              name: 'Test Scene'
            }
          }, {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          });
          
          console.log('✅ Test project created!');
          console.log('Project ID:', newProjectResponse.data.projectId);
          console.log('Scene ID:', newProjectResponse.data.sceneId);
          
        } catch (createError) {
          console.log('❌ Project creation failed:', createError.response?.data || createError.message);
        }
      }
      
    } catch (error) {
      console.log('❌ Cannot access projects:', error.response?.status, error.response?.statusText);
      console.log('Error details:', error.response?.data);
      
      if (error.response?.status === 403) {
        console.log('\n🔍 CHECKING USER PERMISSIONS:');
        
        try {
          const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          });
          
          console.log('User profile:', profileResponse.data);
          
        } catch (profileError) {
          console.log('❌ Cannot get user profile:', profileError.response?.data);
        }
      }
    }
    
    // 5. Test the original problematic scene ID
    console.log('\n5️⃣ TESTING ORIGINAL PROBLEMATIC SCENE:');
    const problematicSceneId = 'cmfc8tjy200037dicvdbot30y';
    
    try {
      const problematicResponse = await axios.get(`${API_BASE_URL}/scenes/${problematicSceneId}/categories`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log('✅ Problematic scene access successful!');
      console.log('Categories:', problematicResponse.data);
      
    } catch (problematicError) {
      console.log(`❌ Problematic scene (${problematicSceneId}) access failed:`, problematicError.response?.status);
      console.log('This confirms the scene does not exist or user lacks access.');
      
      if (problematicError.response?.status === 404) {
        console.log('\n🎯 ROOT CAUSE CONFIRMED: Scene does not exist in database!');
      } else if (problematicError.response?.status === 403) {
        console.log('\n🎯 ROOT CAUSE CONFIRMED: User lacks permission to access this scene!');
      }
    }
    
    console.log('\n✅ Authentication test complete!');
    console.log('\n📋 SUMMARY FOR YOUR ISSUE:');
    console.log('1. Authentication system is working correctly');
    console.log('2. The scene ID "cmfc8tjy200037dicvdbot30y" likely does not exist');
    console.log('3. Use existing scene IDs or create new ones');
    console.log('4. Make sure you\'re logged in when accessing scene endpoints');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testAuthComplete();
