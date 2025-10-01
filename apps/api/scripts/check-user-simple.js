const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserStatus() {
  console.log('🔍 CHECKING USER ACTIVE STATUS');
  console.log('===============================');
  
  try {
    // The user ID from our JWT token
    const userId = 'cmf8cr5l900007dmwvzzxljxi';
    
    console.log('Looking for user ID:', userId);
    console.log('(This is the user ID from the JWT token that\'s being rejected)');
    
    // 1. Check if the specific user exists and their status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!user) {
      console.log('\n❌ USER NOT FOUND IN DATABASE!');
      console.log('This explains the "Invalid token" error.');
      console.log('The JWT token contains a user ID that doesn\'t exist in the database.');
      
      // Check if there are any users at all
      console.log('\n🔍 Checking if there are any users in the database...');
      const userCount = await prisma.user.count();
      console.log(`Total users in database: ${userCount}`);
      
      if (userCount === 0) {
        console.log('\n🚨 DATABASE IS EMPTY - NO USERS EXIST!');
        console.log('You need to seed the database or create users.');
      } else {
        console.log('\n📋 Let me show you the existing users:');
        const existingUsers = await prisma.user.findMany({
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
          },
          take: 10
        });
        
        existingUsers.forEach((existingUser, index) => {
          console.log(`${index + 1}. ${existingUser.email} (${existingUser.role})`);
          console.log(`   ID: ${existingUser.id}`);
          console.log(`   Active: ${existingUser.isActive}`);
          console.log('');
        });
      }
      
    } else {
      console.log('\n✅ USER FOUND!');
      console.log('User details:');
      console.log(`  Email: ${user.email}`);
      console.log(`  Display Name: ${user.displayName}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Is Active: ${user.isActive}`);
      console.log(`  Created: ${user.createdAt.toISOString()}`);
      console.log(`  Updated: ${user.updatedAt.toISOString()}`);
      
      if (!user.isActive) {
        console.log('\n❌ USER IS INACTIVE!');
        console.log('This explains the "Invalid token" error.');
        console.log('The JWT strategy rejects inactive users.');
        console.log('\n🔧 SOLUTION: Activate the user in the database:');
        console.log(`UPDATE "User" SET "isActive" = true WHERE id = '${userId}';`);
      } else {
        console.log('\n✅ USER IS ACTIVE');
        console.log('The user exists and is active, so the "Invalid token" error');
        console.log('must be caused by something else (JWT secret mismatch, etc.)');
      }
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    console.log('\nPossible causes:');
    console.log('1. Database is not running');
    console.log('2. Database connection string is wrong');
    console.log('3. Prisma migrations not applied');
  } finally {
    await prisma.$disconnect();
  }
}

checkUserStatus();