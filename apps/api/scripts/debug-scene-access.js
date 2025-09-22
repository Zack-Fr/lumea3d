const { PrismaClient } = require('@prisma/client');

async function debugSpecificSceneAccess() {
  const prisma = new PrismaClient();
  
  try {
    // Get a scene that belongs to a project where momo is a member
    const scene = await prisma.scene3D.findFirst({
      include: {
        project: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    email: true,
                    role: true  // global role
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (!scene) {
      console.log('❌ No scenes found');
      return;
    }
    
    console.log('=== SCENE ACCESS DEBUG ===');
    console.log(`Scene ID: ${scene.id}`);
    console.log(`Scene Name: ${scene.name}`);
    console.log(`Project ID: ${scene.projectId}`);
    console.log(`Project Name: ${scene.project.name}`);
    
    console.log('\\nProject Members:');
    scene.project.members.forEach(member => {
      console.log(`- ${member.user.email}: ${member.role} (project) / ${member.user.role} (global)`);
    });
    
    // Find momo in this project
    const momoMember = scene.project.members.find(m => m.user.email === 'momo@example.com');
    if (!momoMember) {
      console.log('\\n❌ Momo is NOT a member of this project');
      return;
    }
    
    console.log(`\\n✅ Momo's access to this scene:`);
    console.log(`- Project role: ${momoMember.role}`);
    console.log(`- Global role: ${momoMember.user.role}`);
    console.log(`- User ID: ${momoMember.userId}`);
    
    // Test the authorization logic manually
    console.log('\\n=== TESTING AUTHORIZATION LOGIC ===');
    
    // Simulate what AuthzService.userHasProjectAccess would do
    const member = await prisma.projectMember.findUnique({
      where: { 
        userId_projectId: { 
          userId: momoMember.userId, 
          projectId: scene.projectId 
        } 
      },
      select: { role: true },
    });
    
    console.log(`Database lookup result: ${member ? member.role : 'NOT FOUND'}`);
    console.log(`GET request should be allowed: ${member ? 'YES' : 'NO'}`);
    
    console.log('\\n=== TEST THESE ENDPOINTS ===');
    console.log(`GET /api/scenes/${scene.id} - Should work for momo`);
    console.log(`GET /api/scenes/${scene.id}/manifest - Should work for momo`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSpecificSceneAccess();