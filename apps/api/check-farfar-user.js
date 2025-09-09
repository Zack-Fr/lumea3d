const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkFarfarUser() {
    try {
        const userId = 'cmfceg1vo00007du8i51cq934'; // From the JWT token
        
        console.log('Checking user:', userId);
        
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
            console.log('❌ USER NOT FOUND!');
            console.log('This is why JWT validation fails - user doesn\'t exist in database');
        } else {
            console.log('✅ User found:');
            console.log(JSON.stringify(user, null, 2));
            
            if (!user.isActive) {
                console.log('❌ USER IS INACTIVE!');
                console.log('This is why JWT validation fails');
            } else {
                console.log('✅ User is active');
                console.log('User should pass JWT validation. Issue must be elsewhere.');
            }
        }
        
    } catch (error) {
        console.log('❌ Database error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkFarfarUser();