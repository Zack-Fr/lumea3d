const { PrismaClient } = require('@prisma/client');

async function debugClientAuth() {
  const prisma = new PrismaClient();
  
  try {
    const sceneId = 'cmfbqqgqh00037d94diquv95j';
    
    console.log('=== CLIENT AUTHORIZATION DEBUG ===');
    
    // 1. Get scene and project info
    const scene = await prisma.scene3D.findUnique({
      where: { id: sceneId },
      select: { 
        id: true, 
        projectId: true,
        project: {
          select: {
            id: true,
            name: true,
            userId: true
          }
        }
      },
    });
    
    if (!scene) {
      console.log('❌ Scene not found');
      return;
    }
    
    console.log('Scene project ID:', scene.projectId);
    console.log('Project owner ID:', scene.project.userId);
    
    // 2. Find all project members and their roles
    const members = await prisma.projectMember.findMany({
      where: { projectId: scene.projectId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true
          }
        }
      }
    });
    
    console.log('\\n=== PROJECT MEMBERS ===');
    members.forEach(member => {
      console.log(`User: ${member.user.email} (${member.user.id})`);
      console.log(`Role: ${member.role}`);
      console.log(`---`);
    });
    
    // 3. Test authorization for each member
    console.log('\\n=== AUTHORIZATION TEST ===');
    for (const member of members) {
      console.log(`Testing user: ${member.user.email} (${member.role})`);
      
      // Simulate the exact AuthzService logic
      const memberAccess = await prisma.projectMember.findUnique({
        where: { 
          userId_projectId: { 
            userId: member.userId, 
            projectId: scene.projectId 
          } 
        },
        select: { role: true },
      });
      
      if (!memberAccess) {
        console.log(`  ❌ Not found in ProjectMember table`);
        continue;
      }
      
      const isRead = true; // GET request
      
      // All roles can read
      if (isRead) {
        console.log(`  ✅ Should have READ access (role: ${memberAccess.role})`);
      } else {
        const canWrite = memberAccess.role === 'DESIGNER' || memberAccess.role === 'ADMIN';
        console.log(`  ${canWrite ? '✅' : '❌'} Write access: ${canWrite}`);
      }
    }
    
    // 4. Test specific user if provided
    const projectOwner = scene.project.userId;
    console.log(`\\n=== TESTING PROJECT OWNER: ${projectOwner} ===`);
    
    const ownerMember = await prisma.projectMember.findUnique({
      where: { 
        userId_projectId: { 
          userId: projectOwner, 
          projectId: scene.projectId 
        } 
      },
      select: { role: true },
    });
    
    if (ownerMember) {
      console.log(`✅ Owner is a project member with role: ${ownerMember.role}`);
    } else {
      console.log(`❌ Owner is NOT in ProjectMember table - this is a problem!`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugClientAuth();