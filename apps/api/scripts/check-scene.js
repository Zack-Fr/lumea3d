const { PrismaClient } = require('@prisma/client');

async function checkScene() {
  const prisma = new PrismaClient();
  
  try {
    // Check the specific scene from the logs
    const scene = await prisma.scene3D.findFirst({
      where: { id: 'cmfbqqgqh00037d94diquv95j' },
      include: { 
        items: true,
        project: {
          include: {
            categories3D: {
              include: {
                asset: true
              }
            }
          }
        }
      }
    });
    
    console.log('=== SCENE DEBUG ===');
    console.log('Scene ID:', scene?.id);
    console.log('Scene Name:', scene?.name);
    console.log('Project ID:', scene?.projectId);
    console.log('Items Count:', scene?.items?.length || 0);
    console.log('Items:', JSON.stringify(scene?.items || [], null, 2));
    console.log('Project Categories Count:', scene?.project?.categories3D?.length || 0);
    console.log('Project Categories:', JSON.stringify(scene?.project?.categories3D || [], null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkScene();