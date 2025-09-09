const { PrismaClient } = require('@prisma/client');

async function checkUserMemberships() {
  const prisma = new PrismaClient();
  
  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'farfar@example.com' },
      include: {
        projectMembers: {
          include: {
            project: true
          }
        }
      }
    });
    
    if (!user) {
      console.log('❌ User farfar@example.com not found');
      return;
    }
    
    console.log(`✅ User found: ${user.email} (${user.id})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.active}`);
    console.log(`   Project memberships: ${user.projectMembers.length}`);
    
    if (user.projectMembers.length === 0) {
      console.log('⚠️  User has no project memberships!');
      
      // Check if there are any projects at all
      const allProjects = await prisma.project.findMany({
        include: {
          _count: { select: { members: true } }
        }
      });
      
      console.log(`   Total projects in database: ${allProjects.length}`);
      allProjects.forEach(project => {
        console.log(`   - Project: ${project.name} (${project.id}) - ${project._count.members} members`);
      });
      
      if (allProjects.length > 0) {
        const firstProject = allProjects[0];
        console.log(`\n🔧 Adding user to first project: ${firstProject.name}`);
        
        await prisma.projectMember.create({
          data: {
            userId: user.id,
            projectId: firstProject.id,
            role: 'MEMBER'
          }
        });
        
        console.log('✅ User added to project as MEMBER');
      }
    } else {
      user.projectMembers.forEach(membership => {
        console.log(`   - ${membership.project.name}: ${membership.role}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserMemberships();