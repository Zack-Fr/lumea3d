const { PrismaClient } = require('@prisma/client');

async function debugAuth() {
  const prisma = new PrismaClient();
  
  try {
    const sceneId = 'cmfbqqgqh00037d94diquv95j';
    
    console.log('=== AUTHORIZATION DEBUG ===');
    
    // 1. Check if scene exists and get its project
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
    
    console.log('Scene:', scene);
    
    if (!scene) {
      console.log('❌ Scene not found');
      return;
    }
    
    // 2. Check project members
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
    
    console.log('Project Members:', JSON.stringify(members, null, 2));
    
    // 3. Check if the specific user has access
    const testUserId = scene.project.userId; // Use the project owner
    console.log('Testing access for user ID:', testUserId);
    
    const memberAccess = await prisma.projectMember.findUnique({
      where: { 
        userId_projectId: { 
          userId: testUserId, 
          projectId: scene.projectId 
        } 
      },
      select: { role: true },
    });
    
    console.log('Member access result:', memberAccess);
    
    // 4. Test the exact same logic as AuthzService
    const hasAccess = !!memberAccess;
    console.log('Has access:', hasAccess);
    
    if (!hasAccess) {
      console.log('❌ AUTHORIZATION FAILURE - User is not a member of the project');
    } else {
      console.log('✅ Authorization should work');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAuth();