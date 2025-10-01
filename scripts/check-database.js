const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 CHECKING DATABASE STATE');
  console.log('==========================');
  
  try {
    // 1. Check all users
    console.log('\n1️⃣ USERS IN DATABASE:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            projectMemberships: true,
            ownedProjects: true
          }
        }
      }
    });
    
    if (users.length === 0) {
      console.log('❌ NO USERS FOUND IN DATABASE!');
      console.log('This explains the login failures.');
    } else {
      console.log(`Found ${users.length} users:`);
      for (const user of users) {
        console.log(`  👤 ${user.email} (${user.role})`);
        console.log(`     ID: ${user.id}`);
        console.log(`     Created: ${user.createdAt.toISOString()}`);
        console.log(`     Memberships: ${user._count.projectMemberships}`);
        console.log(`     Owned Projects: ${user._count.ownedProjects}`);
        console.log('');
      }
    }
    
    // 2. Check projects
    console.log('\n2️⃣ PROJECTS IN DATABASE:');
    const projects = await prisma.project.findMany({
      include: {
        owner: {
          select: { email: true }
        },
        members: {
          include: {
            user: {
              select: { email: true }
            }
          }
        },
        scenes3D: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (projects.length === 0) {
      console.log('❌ NO PROJECTS FOUND IN DATABASE!');
    } else {
      console.log(`Found ${projects.length} projects:`);
      for (const project of projects) {
        console.log(`\n  📁 ${project.name} (${project.id})`);
        console.log(`     Owner: ${project.owner.email}`);
        console.log(`     Members: ${project.members.length}`);
        
        if (project.members.length > 0) {
          for (const member of project.members) {
            console.log(`       - ${member.user.email} (${member.role})`);
          }
        }
        
        console.log(`     Scenes: ${project.scenes3D.length}`);
        if (project.scenes3D.length > 0) {
          for (const scene of project.scenes3D) {
            console.log(`       🎬 ${scene.name} (${scene.id})`);
            if (scene.id === 'cmfcbg4kz00037dvo4e74u4ky') {
              console.log('       ⭐ THIS IS THE SCENE FROM FRONTEND!');
            }
          }
        }
      }
    }
    
    // 3. Check if the specific scene exists
    console.log('\n3️⃣ CHECKING TARGET SCENE:');
    const targetScene = await prisma.scene3D.findUnique({
      where: { id: 'cmfcbg4kz00037dvo4e74u4ky' },
      include: {
        project: {
          include: {
            owner: { select: { email: true } },
            members: {
              include: {
                user: { select: { email: true } }
              }
            }
          }
        }
      }
    });
    
    if (!targetScene) {
      console.log('❌ TARGET SCENE NOT FOUND!');
      console.log('Scene ID: cmfcbg4kz00037dvo4e74u4ky');
      console.log('This explains the 401 errors - the scene does not exist.');
    } else {
      console.log('✅ Target scene found:');
      console.log(`   Name: ${targetScene.name}`);
      console.log(`   Project: ${targetScene.project.name}`);
      console.log(`   Project Owner: ${targetScene.project.owner.email}`);
      console.log(`   Project Members: ${targetScene.project.members.length}`);
      
      if (targetScene.project.members.length > 0) {
        console.log('   Members with access:');
        for (const member of targetScene.project.members) {
          console.log(`     - ${member.user.email} (${member.role})`);
        }
      }
    }
    
    // 4. Check if there are any seed files or scripts
    console.log('\n4️⃣ RECOMMENDATIONS:');
    console.log('====================');
    
    if (users.length === 0) {
      console.log('🚨 CRITICAL: Database has no users!');
      console.log('');
      console.log('Solutions:');
      console.log('1. Run database seeding script (check for prisma/seed.ts or similar)');
      console.log('2. Create users manually via API or database');
      console.log('3. Check if migrations need to be run');
      console.log('');
      console.log('Commands to try:');
      console.log('  npx prisma db seed');
      console.log('  npx prisma migrate reset --force');
      console.log('  npm run seed');
    }
    
    if (!targetScene) {
      console.log('🚨 SCENE ISSUE: Frontend is using a non-existent scene ID!');
      console.log('');
      console.log('Solutions:');
      console.log('1. Update frontend to use a valid scene ID');
      console.log('2. Create the missing scene');
      console.log('3. Reset the database with proper seed data');
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
