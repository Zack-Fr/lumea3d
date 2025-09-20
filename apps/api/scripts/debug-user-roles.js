const { PrismaClient } = require('@prisma/client');

async function debugUserRoles() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== USER TABLE ROLES vs PROJECT MEMBER ROLES ===');
    
    // Get all users with their global roles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,  // This is the global role used in JWT
        displayName: true,
      }
    });
    
    console.log('User global roles:');
    users.forEach(user => {
      console.log(`- ${user.email}: ${user.role} (global role in JWT)`);
    });
    
    console.log('\\n=== MOMO USER DETAILED INFO ===');
    const momoUser = users.find(u => u.email === 'momo@example.com');
    if (momoUser) {
      console.log(`Momo's global role (in JWT): ${momoUser.role}`);
      console.log(`Momo's user ID: ${momoUser.id}`);
    }
    
    // Get project roles for momo
    const momoProjectRoles = await prisma.projectMember.findMany({
      where: {
        user: { email: 'momo@example.com' }
      },
      include: {
        project: {
          select: { name: true, id: true }
        }
      },
      take: 5  // Just show first 5 to avoid spam
    });
    
    console.log('\\nMomo\'s project-specific roles (first 5):');
    momoProjectRoles.forEach(member => {
      console.log(`- Project "${member.project.name}": ${member.role} (project role)`);
    });
    
    console.log('\\n=== ROLE COMPARISON ===');
    console.log('JWT contains: User.role (global role)');
    console.log('Project access uses: ProjectMember.role (project-specific role)');
    console.log('These are DIFFERENT role systems!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserRoles();