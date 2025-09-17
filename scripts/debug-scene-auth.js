const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';
const SCENE_ID = 'cmfcbg4kz00037dvo4e74u4ky'; // Your existing scene

async function debugSceneAuth() {
  console.log('🔍 DEBUGGING SCENE AUTHORIZATION ISSUE');
  console.log('======================================');
  console.log('Scene ID:', SCENE_ID);
  
  // Wait to avoid rate limits
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    // 1. Try to login with the user who should have access
    console.log('\n1️⃣ ATTEMPTING LOGIN:');
    
    // Try different users that might have access
    const users = [
      { email: 'momo@example.com', password: 'password123' },
      { email: 'admin@lumea.com', password: 'admin123' },
      { email: 'designer@lumea.com', password: 'designer123' },
      { email: 'client@lumea.com', password: 'client123' },
    ];
    
    let authToken = null;
    let user = null;
    
    for (const cred of users) {
      try {
        console.log(`Trying ${cred.email}...`);
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, cred);
        
        authToken = loginResponse.data.token;
        user = loginResponse.data.user;
        console.log(`✅ Login successful: ${user.email} (${user.role})`);
        break;
      } catch (loginError) {
        if (loginError.response?.status === 429) {
          console.log('❌ Rate limited, waiting...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        console.log(`❌ ${cred.email} failed: ${loginError.response?.data?.message || 'Unknown error'}`);
      }
    }
    
    if (!authToken) {
      console.log('❌ Could not login with any user');
      return;
    }
    
    // 2. Check user's projects to see if they have access to the scene's project
    console.log('\n2️⃣ CHECKING USER PROJECTS:');
    
    try {
      const projectsResponse = await axios.get(`${API_BASE_URL}/projects`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      console.log(`Found ${projectsResponse.data.length} projects for ${user.email}:`);
      
      let targetProject = null;
      let targetScene = null;
      
      for (const project of projectsResponse.data) {
        console.log(`\n  📁 Project: ${project.name} (${project.id})`);
        console.log(`     Members: ${project._count?.members || 0}`);
        
        if (project.scenes3D && project.scenes3D.length > 0) {
          for (const scene of project.scenes3D) {
            console.log(`     🎬 Scene: ${scene.name} (${scene.id})`);
            
            if (scene.id === SCENE_ID) {
              targetProject = project;
              targetScene = scene;
              console.log(`     ✅ FOUND TARGET SCENE! in project "${project.name}"`);
            }
          }
        }
      }
      
      if (!targetProject) {
        console.log(`\n❌ SCENE NOT FOUND IN USER'S PROJECTS!`);
        console.log('This means the user does not have access to the project containing this scene.');
        console.log('\n🔧 SOLUTIONS:');
        console.log('1. Add the user to the project as a member');
        console.log('2. Login with the project owner');
        console.log('3. Use a scene from a project the user has access to');
        return;
      }
      
      console.log(`\n✅ User has access to project "${targetProject.name}"`);
      console.log(`✅ Scene "${targetScene.name}" exists in that project`);
      
    } catch (projectsError) {
      console.log('❌ Failed to get projects:', projectsError.response?.data);
      return;
    }
    
    // 3. Test direct scene access
    console.log('\n3️⃣ TESTING DIRECT SCENE ACCESS:');
    
    try {
      const sceneResponse = await axios.get(`${API_BASE_URL}/scenes/${SCENE_ID}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      console.log('✅ Direct scene access successful!');
      console.log('   Scene name:', sceneResponse.data.name);
      console.log('   Project ID:', sceneResponse.data.projectId);
      
    } catch (sceneError) {
      console.log('❌ Direct scene access failed:', sceneError.response?.status, sceneError.response?.statusText);
      console.log('   Error:', sceneError.response?.data);
      
      if (sceneError.response?.status === 404) {
        console.log('\n🚨 CRITICAL: ScenesAuthGuard is rejecting the scene!');
        console.log('This suggests an issue with the authorization logic.');
      }
    }
    
    // 4. Test the problematic categories endpoint
    console.log('\n4️⃣ TESTING CATEGORIES ENDPOINT (THE FAILING ONE):');
    
    try {
      const categoriesResponse = await axios.get(`${API_BASE_URL}/scenes/${SCENE_ID}/categories`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      console.log('✅ Categories access successful!');
      console.log('   Categories:', categoriesResponse.data.categories?.length || 0);
      
    } catch (categoriesError) {
      console.log('❌ Categories access failed:', categoriesError.response?.status, categoriesError.response?.statusText);
      console.log('   Error details:', categoriesError.response?.data);
      
      if (categoriesError.response?.status === 401) {
        console.log('\n🔍 DEBUGGING 401 ERROR:');
        console.log('This could be:');
        console.log('1. JWT token validation failing');
        console.log('2. ScenesAuthGuard not finding the scene');
        console.log('3. AuthzService rejecting project access');
        console.log('4. ProjectCategory3DService access check failing');
        
        // Test JWT token validity
        try {
          const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          console.log('✅ JWT token is valid (profile access works)');
          console.log('   User profile:', profileResponse.data.email);
        } catch (profileError) {
          console.log('❌ JWT token invalid:', profileError.response?.data);
        }
      }
    }
    
    console.log('\n📋 DIAGNOSTIC COMPLETE');
    console.log('=====================');
    
  } catch (error) {
    console.error('❌ Diagnostic script failed:', error.message);
  }
}

debugSceneAuth();
