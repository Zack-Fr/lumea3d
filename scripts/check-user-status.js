const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUser() {
    try {
        console.log('=== USER STATUS CHECK ===');
        
        // The user ID from our JWT token payload
        const userId = 'cmf8cr5l900007dmwvzzxljxi';
        
        console.log('Looking for user ID:', userId);
        
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
            console.log('❌ USER NOT FOUND in database!');
            console.log('This explains the "Invalid token" error.');
        } else {
            console.log('✅ User found:', JSON.stringify(user, null, 2));
            
            if (!user.isActive) {
                console.log('❌ USER IS INACTIVE!');
                console.log('This explains the "Invalid token" error.');
            } else {
                console.log('✅ User is active');
            }
        }
        
    } catch (error) {
        console.log('❌ Database error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkUser();