const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function debugAuthIssue() {
  try {
    console.log('🔍 DEBUGGING AUTHENTICATION ISSUE');
    console.log('=====================================');
    
    // 1. Check all users
    console.log('\n1️⃣ USERS IN DATABASE:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        isActive: true
      }
    });
    console.table(users);
    
    // 2. Check if momo user exists
    console.log('\n2️⃣ CHECKING FOR MOMO USER:');
    const momoUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'momo' } },
          { displayName: { contains: 'momo' } }
        ]
      }
    });
    console.log('Momo user found:', momoUser || 'NONE');
    
    // 3. Check all projects
    console.log('\n3️⃣ PROJECTS IN DATABASE:');
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        userId: true,
        user: {
          select: { email: true }
        }
      }
    });
    console.table(projects);
    
    // 4. Check all scenes
    console.log('\n4️⃣ SCENES IN DATABASE:');
    const scenes = await prisma.scene3D.findMany({
      select: {
        id: true,
        name: true,
        projectId: true,
        project: {
          select: {
            name: true,
            user: {
              select: { email: true }
            }
          }
        }
      }
    });
    console.table(scenes);
    
    // 5. Check the specific scene ID from error logs
    const problemSceneId = 'cmfc8tjy200037dicvdbot30y';
    console.log(`\n5️⃣ CHECKING PROBLEM SCENE ID: ${problemSceneId}`);
    const problemScene = await prisma.scene3D.findUnique({
      where: { id: problemSceneId },
      include: {
        project: {
          include: {
            user: true,
            members: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });
    console.log('Problem scene found:', problemScene || 'SCENE DOES NOT EXIST!');
    
    // 6. Check ProjectMember table
    console.log('\n6️⃣ PROJECT MEMBERS:');
    try {
      const projectMembers = await prisma.projectMember.findMany({
        include: {
          user: {
            select: { email: true }
          },
          project: {
            select: { name: true }
          }
        }
      });
      console.table(projectMembers);
    } catch (error) {
      console.log('❌ ProjectMember table error:', error.message);
    }
    
    // 7. Check if there are any active sessions
    console.log('\n7️⃣ ACTIVE USER SESSIONS:');
    const sessions = await prisma.session.findMany({
      where: {
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: {
          select: { email: true }
        }
      }
    });
    console.table(sessions);
    
    console.log('\n✅ Debug complete!');
    console.log('\n📋 SUMMARY:');
    console.log(`- Users found: ${users.length}`);
    console.log(`- Projects found: ${projects.length}`);
    console.log(`- Scenes found: ${scenes.length}`);
    console.log(`- Problem scene exists: ${problemScene ? 'YES' : 'NO'}`);
    
    if (!problemScene) {
      console.log('\n🎯 ROOT CAUSE IDENTIFIED:');
      console.log(`The scene ID "${problemSceneId}" does not exist in the database!`);
      console.log('This is why you get 401 Unauthorized errors.');
      console.log('\nSOLUTION OPTIONS:');
      console.log('1. Use an existing scene ID from the list above');
      console.log('2. Create a new scene through the API');
      console.log('3. Check if you\'re connecting to the right database');
    }
    
  } catch (error) {
    console.error('❌ Error debugging auth issue:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug function
debugAuthIssue();
