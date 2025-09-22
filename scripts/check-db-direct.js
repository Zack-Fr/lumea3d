const { Client } = require('pg');

// Database connection details - from API .env file
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'lumea_db',
  user: 'postgres',
  password: 'postgres',
});

async function checkDatabase() {
  console.log('🔍 CHECKING DATABASE STATE (Direct SQL)');
  console.log('========================================');
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // 1. Check all users
    console.log('\n1️⃣ USERS IN DATABASE:');
    const usersResult = await client.query('SELECT id, email, role, "createdAt" FROM "User" ORDER BY "createdAt"');
    
    if (usersResult.rows.length === 0) {
      console.log('❌ NO USERS FOUND IN DATABASE!');
    } else {
      console.log(`Found ${usersResult.rows.length} users:`);
      for (const user of usersResult.rows) {
        console.log(`  👤 ${user.email} (${user.role})`);
        console.log(`     ID: ${user.id}`);
        console.log(`     Created: ${user.createdAt}`);
        
        // Check if this is the momo user from your trace
        if (user.id === 'cmf8cr5l900007dmwvzzxljxi') {
          console.log(`     ⭐ THIS IS THE USER FROM YOUR TRACE!`);
        }
      }
    }
    
    // 2. Check projects
    console.log('\n2️⃣ PROJECTS IN DATABASE:');
    const projectsResult = await client.query(`
      SELECT p.id, p.name, p."userId" as owner_id, u.email as owner_email
      FROM "Project" p
      JOIN "User" u ON p."userId" = u.id
      ORDER BY p."createdAt"
    `);
    
    if (projectsResult.rows.length === 0) {
      console.log('❌ NO PROJECTS FOUND!');
    } else {
      console.log(`Found ${projectsResult.rows.length} projects:`);
      for (const project of projectsResult.rows) {
        console.log(`\n  📁 ${project.name} (${project.id})`);
        console.log(`     Owner: ${project.owner_email} (${project.owner_id})`);
        
        // Check if this is the project from your trace
        if (project.id === 'cmfcbg4kv00017dvo0wqfvytn') {
          console.log(`     ⭐ THIS IS THE PROJECT FROM YOUR TRACE!`);
        }
      }
    }
    
    // 3. Check project memberships
    console.log('\n3️⃣ PROJECT MEMBERSHIPS:');
    const membershipsResult = await client.query(`
      SELECT pm."projectId", pm."userId", pm.role, 
             u.email as user_email, p.name as project_name
      FROM "ProjectMember" pm
      JOIN "User" u ON pm."userId" = u.id
      JOIN "Project" p ON pm."projectId" = p.id
    `);
    
    if (membershipsResult.rows.length === 0) {
      console.log('❌ NO PROJECT MEMBERSHIPS FOUND!');
    } else {
      console.log(`Found ${membershipsResult.rows.length} memberships:`);
      for (const membership of membershipsResult.rows) {
        console.log(`  👥 ${membership.user_email} → ${membership.project_name} (${membership.role})`);
        console.log(`     Project ID: ${membership.projectId}`);
        console.log(`     User ID: ${membership.userId}`);
        
        // Check if this involves the traced IDs
        if (membership.userId === 'cmf8cr5l900007dmwvzzxljxi' && 
            membership.projectId === 'cmfcbg4kv00017dvo0wqfvytn') {
          console.log(`     ⭐ THIS IS THE MEMBERSHIP FROM YOUR TRACE!`);
        }
      }
    }
    
    // 4. Check scenes3D
    console.log('\n4️⃣ SCENES3D IN DATABASE:');
    const scenesResult = await client.query(`
      SELECT s.id, s.name, s."projectId", p.name as project_name
      FROM "Scene3D" s
      JOIN "Project" p ON s."projectId" = p.id
      ORDER BY s."createdAt"
    `);
    
    if (scenesResult.rows.length === 0) {
      console.log('❌ NO 3D SCENES FOUND!');
    } else {
      console.log(`Found ${scenesResult.rows.length} scenes:`);
      for (const scene of scenesResult.rows) {
        console.log(`  🎬 ${scene.name} (${scene.id})`);
        console.log(`     Project: ${scene.project_name} (${scene.projectId})`);
        
        // Check if this is the scene from your trace
        if (scene.id === 'cmfcbg4kz00037dvo4e74u4ky') {
          console.log(`     ⭐ THIS IS THE SCENE FROM YOUR TRACE!`);
        }
      }
    }
    
    // 5. Check the specific authorization chain
    console.log('\n5️⃣ AUTHORIZATION CHAIN CHECK:');
    const targetUserId = 'cmf8cr5l900007dmwvzzxljxi'; // momo@example.com
    const targetSceneId = 'cmfcbg4kz00037dvo4e74u4ky';
    const targetProjectId = 'cmfcbg4kv00017dvo0wqfvytn';
    
    // Check if user exists
    const userCheck = await client.query('SELECT email FROM "User" WHERE id = $1', [targetUserId]);
    console.log(`User ${targetUserId}: ${userCheck.rows.length > 0 ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    if (userCheck.rows.length > 0) {
      console.log(`  Email: ${userCheck.rows[0].email}`);
    }
    
    // Check if scene exists
    const sceneCheck = await client.query('SELECT name, "projectId" FROM "Scene3D" WHERE id = $1', [targetSceneId]);
    console.log(`Scene ${targetSceneId}: ${sceneCheck.rows.length > 0 ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    if (sceneCheck.rows.length > 0) {
      console.log(`  Name: ${sceneCheck.rows[0].name}`);
      console.log(`  Project ID: ${sceneCheck.rows[0].projectId}`);
    }
    
    // Check if project exists
    const projectCheck = await client.query('SELECT name FROM "Project" WHERE id = $1', [targetProjectId]);
    console.log(`Project ${targetProjectId}: ${projectCheck.rows.length > 0 ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    if (projectCheck.rows.length > 0) {
      console.log(`  Name: ${projectCheck.rows[0].name}`);
    }
    
    // Check if user has membership to this project
    const membershipCheck = await client.query(`
      SELECT role FROM "ProjectMember" 
      WHERE "userId" = $1 AND "projectId" = $2
    `, [targetUserId, targetProjectId]);
    console.log(`Membership ${targetUserId} → ${targetProjectId}: ${membershipCheck.rows.length > 0 ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    if (membershipCheck.rows.length > 0) {
      console.log(`  Role: ${membershipCheck.rows[0].role}`);
    }
    
    // Check if user owns the project
    const ownershipCheck = await client.query(`
      SELECT name FROM "Project" 
      WHERE id = $1 AND "userId" = $2
    `, [targetProjectId, targetUserId]);
    console.log(`Ownership ${targetUserId} owns ${targetProjectId}: ${ownershipCheck.rows.length > 0 ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n6️⃣ DIAGNOSIS:');
    console.log('============');
    
    const userExists = userCheck.rows.length > 0;
    const sceneExists = sceneCheck.rows.length > 0;
    const projectExists = projectCheck.rows.length > 0;
    const hasProjectAccess = membershipCheck.rows.length > 0 || ownershipCheck.rows.length > 0;
    
    if (!userExists) {
      console.log('🚨 CRITICAL: The traced user does not exist!');
    } else if (!sceneExists) {
      console.log('🚨 CRITICAL: The traced scene does not exist!');
    } else if (!projectExists) {
      console.log('🚨 CRITICAL: The traced project does not exist!');
    } else if (!hasProjectAccess) {
      console.log('🚨 AUTHORIZATION ISSUE: User exists, scene exists, but user has no access to the project!');
      console.log('   This explains the 401 Unauthorized errors.');
      console.log('   SOLUTION: Add user as a member to the project, or login with project owner.');
    } else {
      console.log('✅ All data exists and user should have access.');
      console.log('   The 401 error might be due to JWT token issues or auth guard bugs.');
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Is PostgreSQL running on localhost:5432?');
    } else if (error.code === '28P01') {
      console.error('   Authentication failed - check username/password');
    } else if (error.code === '3D000') {
      console.error('   Database "lumea" does not exist');
    }
  } finally {
    await client.end();
  }
}

checkDatabase();
