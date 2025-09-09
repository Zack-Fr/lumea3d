const { PrismaClient } = require('@prisma/client');

async function debugCategoriesAuth() {
  const prisma = new PrismaClient();
  
  try {
    const sceneId = 'cmfcdclnp00037dmc0seherag'; // From your error
    const userId = 'cmf8cr5l900007dmwvzzxljxi'; // momo's user ID
    
    console.log('=== DEBUG SCENE CATEGORIES AUTHORIZATION ===');
    console.log(`Scene ID: ${sceneId}`);
    console.log(`User ID: ${userId}`);
    
    // Step 1: Check if scene exists
    const scene = await prisma.scene3D.findUnique({
      where: { id: sceneId },
      select: { 
        id: true,
        name: true, 
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
    
    console.log(`✅ Scene found: ${scene.name}`);
    console.log(`Project ID: ${scene.projectId}`);
    console.log(`Project name: ${scene.project.name}`);
    console.log(`Project owner: ${scene.project.userId}`);
    
    // Step 2: Check project membership
    const projectAccess = await prisma.project.findFirst({
      where: {
        id: scene.projectId,
        OR: [
          { userId: userId }, // Owner
          { members: { some: { userId: userId } } } // Member
        ]
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                email: true,
                role: true
              }
            }
          }
        }
      }
    });
    
    if (!projectAccess) {
      console.log('❌ User has NO access to project');
      console.log('Checking what access momo actually has...');
      
      const allProjects = await prisma.project.findMany({
        where: {
          OR: [
            { userId: userId },
            { members: { some: { userId: userId } } }
          ]
        },
        select: {
          id: true,
          name: true,
          userId: true
        },
        take: 5
      });
      
      console.log('Projects momo has access to:');
      allProjects.forEach(p => {
        console.log(`- ${p.name} (${p.id}) - owner: ${p.userId}`);
      });
      
      return;
    }
    
    console.log('✅ User has project access');
    console.log('Project members:');
    projectAccess.members.forEach(member => {
      console.log(`- ${member.user.email}: ${member.role} (project) / ${member.user.role} (global)`);
    });
    
    // Step 3: Test the AuthzService logic manually
    const member = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId: scene.projectId } },
      select: { role: true },
    });
    
    if (!member) {
      console.log('❌ No project membership found');
    } else {
      console.log(`✅ Project membership: ${member.role}`);
      console.log('✅ GET request should be allowed (all roles can read)');
    }
    
    // Step 4: Test categories query
    console.log('\\n=== TESTING CATEGORIES QUERY ===');
    try {
      const categories = await prisma.projectCategory3D.findMany({
        where: { projectId: scene.projectId },
        include: {
          asset: {
            select: {
              id: true,
              originalName: true,
              mimeType: true,
              status: true,
            },
          },
        },
        take: 3
      });
      
      console.log(`✅ Found ${categories.length} categories`);
      if (categories.length > 0) {
        console.log('Sample categories:');
        categories.forEach(cat => {
          console.log(`- ${cat.categoryKey}: ${cat.asset.originalName}`);
        });
      }
    } catch (error) {
      console.log('❌ Categories query failed:', error.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCategoriesAuth();