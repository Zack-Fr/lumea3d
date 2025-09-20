const { PrismaClient } = require('@prisma/client');

async function debugAllUsers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== ALL USERS AND THEIR PROJECT ACCESS ===');
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
      }
    });
    
    console.log('All users in system:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.id})`);
    });
    
    // Get all project members
    console.log('\\n=== ALL PROJECT MEMBERS ===');
    const allMembers = await prisma.projectMember.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    allMembers.forEach(member => {
      console.log(`Project: ${member.project.name} (${member.project.id})`);
      console.log(`  User: ${member.user.email} (${member.user.id})`);
      console.log(`  Role: ${member.role}`);
      console.log('---');
    });
    
    // Check specifically for CLIENT role users
    console.log('\\n=== USERS WITH CLIENT ROLE ===');
    const clientUsers = allMembers.filter(m => m.role === 'CLIENT');
    if (clientUsers.length === 0) {
      console.log('❌ No users with CLIENT role found in any project');
    } else {
      clientUsers.forEach(member => {
        console.log(`${member.user.email} is CLIENT in project ${member.project.name}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAllUsers();