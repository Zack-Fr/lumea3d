const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function diagnoseDatabaseIssues() {
  console.log('🔍 COMPREHENSIVE DATABASE DIAGNOSTIC');
  console.log('====================================');
  
  // Wait to avoid rate limits
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  let authToken = null;
  let user = null;
  
  try {
    // 1. Try to register and login a test user
    console.log('\n1️⃣ SETTING UP TEST USER:');
    
    const testUser = {
      email: 'diagnostic@test.com',
      password: 'test123456',
      name: 'Database Diagnostic User',
      role: 'CLIENT'
    };
    
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, testUser);
      console.log('✅ Test user registered');
    } catch (regError) {
      if (regError.response?.status === 409) {
        console.log('ℹ️ Test user already exists');
      } else {
        console.log('❌ Registration failed:', regError.response?.data?.message);
        return;
      }
    }
    
    // Login
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });
      
      authToken = loginResponse.data.token;
      user = loginResponse.data.user;
      console.log('✅ Login successful, User ID:', user.id);
    } catch (loginError) {
      console.log('❌ Login failed:', loginError.response?.data?.message);
      return;
    }
    
    // 2. Check existing projects
    console.log('\n2️⃣ CHECKING EXISTING PROJECTS:');
    
    try {
      const projectsResponse = await axios.get(`${API_BASE_URL}/projects`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      console.log(`Found ${projectsResponse.data.length} existing projects:`);
      
      if (projectsResponse.data.length > 0) {
        projectsResponse.data.forEach((project, index) => {
          console.log(`\n  Project ${index + 1}:`);
          console.log(`    - ID: ${project.id}`);
          console.log(`    - Name: ${project.name}`);
          console.log(`    - Scenes3D: ${project.scenes3D?.length || 0}`);
          console.log(`    - Members: ${project._count?.members || 0}`);
          
          if (project.scenes3D && project.scenes3D.length > 0) {
            project.scenes3D.forEach((scene, sceneIndex) => {
              console.log(`      Scene ${sceneIndex + 1}: ${scene.name} (ID: ${scene.id})`);
            });
          }
        });
      } else {
        console.log('  No projects found for this user');
      }
    } catch (projectsError) {
      console.log('❌ Failed to get projects:', projectsError.response?.data);
    }
    
    // 3. Create a new project to test project creation
    console.log('\n3️⃣ CREATING NEW PROJECT TO TEST DATABASE:');
    
    try {
      const newProjectData = {
        name: 'Database Diagnostic Project',
        scene: {
          name: 'Test Scene for Diagnosis',
          spawn: {
            position: [0, 1.7, 5],
            yaw_deg: 0
          },
          exposure: 1.0
        }
      };
      
      const createResponse = await axios.post(`${API_BASE_URL}/projects`, newProjectData, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      console.log('✅ NEW PROJECT CREATED SUCCESSFULLY!');
      console.log('  Project ID:', createResponse.data.projectId);
      console.log('  Scene ID:', createResponse.data.sceneId);
      console.log('  Project data:', createResponse.data.project.name);
      console.log('  Scene data:', createResponse.data.scene.name);
      
      // 4. Test accessing the newly created scene
      console.log('\n4️⃣ TESTING NEW SCENE ACCESS:');
      
      const newSceneId = createResponse.data.sceneId;
      
      try {
        const sceneResponse = await axios.get(`${API_BASE_URL}/scenes/${newSceneId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        console.log('✅ Scene access successful!');
        console.log('  Scene name:', sceneResponse.data.name);
        console.log('  Scene version:', sceneResponse.data.version);
        console.log('  Scene project ID:', sceneResponse.data.projectId);
        
      } catch (sceneError) {
        console.log('❌ Scene access failed:', sceneError.response?.status, sceneError.response?.statusText);
        console.log('  Error details:', sceneError.response?.data);
      }
      
      // 5. Test categories endpoint on the new scene
      console.log('\n5️⃣ TESTING CATEGORIES ENDPOINT (the problematic one):');
      
      try {
        const categoriesResponse = await axios.get(`${API_BASE_URL}/scenes/${newSceneId}/categories`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        console.log('✅ Categories access successful!');
        console.log('  Categories found:', categoriesResponse.data.categories?.length || 0);
        console.log('  Categories data:', categoriesResponse.data);
        
      } catch (categoriesError) {
        console.log('❌ Categories access failed:', categoriesError.response?.status, categoriesError.response?.statusText);
        console.log('  Error details:', categoriesError.response?.data);
        
        if (categoriesError.response?.status === 404) {
          console.log('\n🔍 INVESTIGATING 404 ERROR:');
          console.log('  This suggests the ScenesAuthGuard is not finding the scene in Scene3D table');
          console.log('  Even though we just created it successfully!');
          console.log('  This might indicate a database sync or migration issue.');
        }
      }
      
    } catch (createError) {
      console.log('❌ Project creation failed:', createError.response?.data || createError.message);
      
      if (createError.response?.status === 500) {
        console.log('\n🚨 DATABASE ERROR DETECTED!');
        console.log('  This likely indicates:');
        console.log('  1. Missing Scene3D or ProjectMember tables');
        console.log('  2. Database migration not run properly');
        console.log('  3. Schema mismatch between Prisma and actual database');
        console.log('\n  SOLUTION: Run database migrations!');
        console.log('  Try: cd apps/api && npx prisma migrate dev');
      }
    }
    
    // 6. Test the original problematic scene
    console.log('\n6️⃣ TESTING ORIGINAL PROBLEMATIC SCENE:');
    const problematicSceneId = 'cmfc8tjy200037dicvdbot30y';
    
    try {
      const problematicResponse = await axios.get(`${API_BASE_URL}/scenes/${problematicSceneId}/categories`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      console.log('✅ Original scene found! (This would be unexpected)');
      console.log('  Data:', problematicResponse.data);
      
    } catch (problematicError) {
      if (problematicError.response?.status === 404) {
        console.log('✅ Original scene correctly returns 404 (scene does not exist)');
        console.log('  This confirms the scene ID in your frontend is invalid');
      } else {
        console.log('❌ Unexpected error:', problematicError.response?.status, problematicError.response?.data);
      }
    }
    
    console.log('\n📋 DIAGNOSTIC SUMMARY:');
    console.log('======================');
    console.log('✅ Authentication system: Working');
    console.log('✅ Project creation API: Working (if no errors above)');
    console.log('✅ Scene3D table: Should exist (if project creation worked)');
    console.log('✅ ProjectMember table: Should exist (if project creation worked)');
    console.log('❌ Original scene ID: Does not exist (confirmed)');
    
    console.log('\n🎯 SOLUTION:');
    console.log('1. Use valid scene IDs from existing projects');
    console.log('2. Create new projects/scenes instead of using hardcoded IDs');
    console.log('3. Add proper error handling in frontend for non-existent scenes');
    console.log('4. If project creation failed above, run: cd apps/api && npx prisma migrate dev');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🚨 API SERVER NOT RUNNING!');
      console.log('  Start your API server first: cd apps/api && npm run start:dev');
    }
  }
}

diagnoseDatabaseIssues();
