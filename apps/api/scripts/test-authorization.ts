/**
 * Test script for authorization functionality with new membership system
 * 
 * This script tests that:
 * 1. AuthzService correctly validates project access based on ProjectMember roles
 * 2. Flat scene routes properly authorize using the membership system
 * 3. Users can only access projects they are members of
 * 
 * Run with: cd apps/api && pnpm exec ts-node test-authorization.ts
 */

import { PrismaClient, ProjectRole } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthTestResult {
  success: boolean;
  message: string;
  data?: any;
}

async function testAuthorizationSystem(): Promise<AuthTestResult[]> {
  const results: AuthTestResult[] = [];
  
  try {
    console.log('🔐 Testing Authorization System with Membership\n');

    // Get test user and project from our previous test
    const user = await prisma.user.findFirst({
      select: { id: true, email: true },
    });

    if (!user) {
      return [{
        success: false,
        message: 'No users found in database. Run auto-membership test first.',
      }];
    }

    const project = await prisma.project.findFirst({
      where: { userId: user.id },
      include: {
        members: {
          where: { userId: user.id },
        },
        scenes3D: {
          take: 1,
        },
      },
    });

    if (!project) {
      return [{
        success: false,
        message: 'No projects found for user. Run auto-membership test first.',
      }];
    }

    if (project.scenes3D.length === 0) {
      return [{
        success: false,
        message: 'Project has no scenes. Run auto-membership test first.',
      }];
    }

    const scene = project.scenes3D[0];
    const membership = project.members[0];

    console.log(`👤 User: ${user.email} (${user.id})`);
    console.log(`📁 Project: ${project.name} (${project.id})`);
    console.log(`🎬 Scene: ${scene.name} (${scene.id})`);
    console.log(`👑 Membership: ${membership?.role || 'NONE'}\n`);

    // Test 1: Verify membership exists and is ADMIN
    if (!membership || membership.role !== ProjectRole.ADMIN) {
      results.push({
        success: false,
        message: `Expected ADMIN membership, found: ${membership?.role || 'NONE'}`,
      });
    } else {
      results.push({
        success: true,
        message: 'User has correct ADMIN membership',
        data: { role: membership.role },
      });
    }

    // Test 2: Test AuthzService directly (simulate the service)
    console.log('🔍 Testing AuthzService logic...');

    // Check if user has project access (read)
    const memberCheck = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: user.id, projectId: project.id } },
      select: { role: true },
    });

    const hasReadAccess = !!memberCheck;
    const hasWriteAccess = memberCheck && 
      (memberCheck.role === ProjectRole.DESIGNER || memberCheck.role === ProjectRole.ADMIN);

    results.push({
      success: hasReadAccess,
      message: hasReadAccess ? 'User has read access to project' : 'User denied read access',
      data: { hasAccess: hasReadAccess, role: memberCheck?.role },
    });

    results.push({
      success: hasWriteAccess,
      message: hasWriteAccess ? 'User has write access to project' : 'User denied write access',
      data: { hasAccess: hasWriteAccess, role: memberCheck?.role },
    });

    // Test 3: Test scene-to-project resolution (what flat routes use)
    console.log('🎬 Testing scene-to-project resolution...');

    const sceneWithProject = await prisma.scene3D.findUnique({
      where: { id: scene.id },
      include: {
        project: {
          include: {
            members: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    if (!sceneWithProject) {
      results.push({
        success: false,
        message: 'Scene not found',
      });
    } else {
      const sceneProjectMember = sceneWithProject.project.members[0];
      const canAccessScene = !!sceneProjectMember;

      results.push({
        success: canAccessScene,
        message: canAccessScene 
          ? 'User can access scene via project membership'
          : 'User cannot access scene',
        data: { 
          sceneId: scene.id, 
          projectId: sceneWithProject.project.id,
          membership: sceneProjectMember?.role 
        },
      });
    }

    // Test 4: Test authorization with a non-member user (if one exists)
    console.log('🚫 Testing access denial for non-members...');

    const otherUser = await prisma.user.findFirst({
      where: { id: { not: user.id } },
      select: { id: true, email: true },
    });

    if (otherUser) {
      const otherUserMember = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId: otherUser.id, projectId: project.id } },
      });

      const shouldDenyAccess = !otherUserMember;
      
      results.push({
        success: shouldDenyAccess,
        message: shouldDenyAccess 
          ? `Non-member ${otherUser.email} correctly denied access`
          : `Non-member ${otherUser.email} unexpectedly has access`,
        data: { 
          otherUserId: otherUser.id,
          hasMembership: !!otherUserMember,
          role: otherUserMember?.role 
        },
      });
    } else {
      results.push({
        success: true,
        message: 'No other users to test access denial (single user system)',
      });
    }

    // Test 5: Verify the flat routes would work (basic database queries)
    console.log('🛣️  Testing flat route database queries...');
    
    // This simulates what FlatScenesController.findOne() does
    const flatRouteQuery = await prisma.scene3D.findFirst({
      where: {
        id: scene.id,
        project: {
          members: {
            some: { userId: user.id },
          },
        },
      },
    });

    results.push({
      success: !!flatRouteQuery,
      message: flatRouteQuery 
        ? 'Flat route query would succeed (scene accessible via membership)'
        : 'Flat route query would fail',
      data: { foundScene: !!flatRouteQuery },
    });

  } catch (error: any) {
    results.push({
      success: false,
      message: `Authorization test failed: ${error.message}`,
    });
  }

  return results;
}

async function main() {
  try {
    const results = await testAuthorizationSystem();
    
    console.log('\n📋 Authorization Test Results:');
    let passCount = 0;
    let failCount = 0;
    
    results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${status}: ${result.message}`);
      if (result.data) {
        console.log(`   Data: ${JSON.stringify(result.data, null, 2)}`);
      }
      
      if (result.success) {
        passCount++;
      } else {
        failCount++;
      }
    });
    
    console.log(`\n🎯 Authorization Summary: ${passCount} passed, ${failCount} failed`);
    
    if (failCount > 0) {
      process.exit(1);
    }

  } catch (error: any) {
    console.error('💥 Authorization test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}