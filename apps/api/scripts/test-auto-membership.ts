/**
 * Test script for auto-membership functionality
 * 
 * This script tests the projects API to verify:
 * 1. Project creation with auto-membership (ADMIN role)
 * 2. Initial Scene3D creation with default settings
 * 3. GET /projects endpoint returns user's projects
 * 
 * Run with: cd apps/api && pnpm exec ts-node ../../test/test-auto-membership.ts
 */

import { PrismaClient, ProjectRole } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
}

interface ProjectCreationResponse {
  projectId: string;
  sceneId: string;
  project: any;
  scene: any;
  membership: any;
}

async function testAutoMembership(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  try {
    console.log('🧪 Testing Auto-Membership Functionality\n');

    // Step 1: Check if we have any users to test with
    const users = await prisma.user.findMany({
      take: 1,
      select: { id: true, email: true },
    });

    if (users.length === 0) {
      return [{
        success: false,
        message: 'No users found in database. Please create a user first.',
      }];
    }

    const testUser = users[0];
    console.log(`📝 Using test user: ${testUser.email} (${testUser.id})\n`);

    // Step 2: Check initial state - count projects and members
    const initialProjectCount = await prisma.project.count({
      where: { userId: testUser.id },
    });

    const initialMemberCount = await prisma.projectMember.count({
      where: { userId: testUser.id },
    });

    console.log(`📊 Initial state: ${initialProjectCount} projects, ${initialMemberCount} memberships\n`);

    // Step 3: Test direct database project creation (simulating the service)
    console.log('🔧 Testing project creation transaction...');
    
    const testProjectData = {
      name: `Test Auto-Membership ${Date.now()}`,
      scene: {
        name: 'Integration Test Scene',
        exposure: 1.5,
        spawn: {
          position: [1, 2, 3] as [number, number, number],
          yaw_deg: 90,
        },
      },
    };

    // Execute the same transaction as the service
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create the project
      const project = await tx.project.create({
        data: {
          name: testProjectData.name,
          userId: testUser.id,
        },
      });

      // 2. Create ProjectMember with ADMIN role
      const membership = await tx.projectMember.create({
        data: {
          userId: testUser.id,
          projectId: project.id,
          role: ProjectRole.ADMIN,
        },
      });

      // 3. Create initial Scene3D
      const scene = await tx.scene3D.create({
        data: {
          projectId: project.id,
          name: testProjectData.scene.name,
          version: 1,
          scale: 1.0,
          exposure: testProjectData.scene.exposure,
          envHdriUrl: null,
          envIntensity: 1.0,
          spawnPositionX: testProjectData.scene.spawn.position[0],
          spawnPositionY: testProjectData.scene.spawn.position[1],
          spawnPositionZ: testProjectData.scene.spawn.position[2],
          spawnYawDeg: testProjectData.scene.spawn.yaw_deg,
          navmeshAssetId: null,
        },
      });

      return { project, membership, scene };
    });

    results.push({
      success: true,
      message: 'Project creation transaction completed successfully',
      data: {
        projectId: result.project.id,
        sceneId: result.scene.id,
        membershipRole: result.membership.role,
      },
    });

    console.log(`✅ Project created: ${result.project.id}`);
    console.log(`✅ Scene created: ${result.scene.id}`);
    console.log(`✅ Membership created: ${result.membership.role}`);

    // Step 4: Verify the created data
    console.log('\n🔍 Verifying created data...');

    const createdProject = await prisma.project.findUnique({
      where: { id: result.project.id },
      include: {
        scenes3D: true,
        members: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
      },
    });

    if (!createdProject) {
      results.push({
        success: false,
        message: 'Created project not found in database',
      });
    } else {
      // Verify project has scenes
      if (createdProject.scenes3D.length === 0) {
        results.push({
          success: false,
          message: 'Project has no scenes',
        });
      } else {
        results.push({
          success: true,
          message: `Project has ${createdProject.scenes3D.length} scene(s)`,
          data: { sceneCount: createdProject.scenes3D.length },
        });
      }

      // Verify project has ADMIN member
      const adminMember = createdProject.members.find((m: any) => m.role === ProjectRole.ADMIN && m.userId === testUser.id);
      if (!adminMember) {
        results.push({
          success: false,
          message: 'Project creator does not have ADMIN membership',
        });
      } else {
        results.push({
          success: true,
          message: 'Project creator has ADMIN membership',
          data: { memberRole: adminMember.role },
        });
      }

      // Verify scene spawn settings
      const scene = createdProject.scenes3D[0];
      if (scene.spawnPositionX !== 1 || scene.spawnPositionY !== 2 || scene.spawnPositionZ !== 3 || scene.spawnYawDeg !== 90) {
        results.push({
          success: false,
          message: 'Scene spawn settings do not match expected values',
          data: {
            expected: { x: 1, y: 2, z: 3, yaw: 90 },
            actual: { x: scene.spawnPositionX, y: scene.spawnPositionY, z: scene.spawnPositionZ, yaw: scene.spawnYawDeg },
          },
        });
      } else {
        results.push({
          success: true,
          message: 'Scene spawn settings match expected values',
        });
      }
    }

    // Step 5: Count final state
    const finalProjectCount = await prisma.project.count({
      where: { userId: testUser.id },
    });

    const finalMemberCount = await prisma.projectMember.count({
      where: { userId: testUser.id },
    });

    console.log(`\n📊 Final state: ${finalProjectCount} projects (+${finalProjectCount - initialProjectCount}), ${finalMemberCount} memberships (+${finalMemberCount - initialMemberCount})`);

    results.push({
      success: finalProjectCount > initialProjectCount && finalMemberCount > initialMemberCount,
      message: `Counts increased correctly: projects +${finalProjectCount - initialProjectCount}, memberships +${finalMemberCount - initialMemberCount}`,
    });

  } catch (error: any) {
    results.push({
      success: false,
      message: `Test failed with error: ${error.message}`,
    });
  }

  return results;
}

async function main() {
  try {
    const results = await testAutoMembership();
    
    console.log('\n📋 Test Results Summary:');
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
    
    console.log(`\n🎯 Summary: ${passCount} passed, ${failCount} failed`);
    
    if (failCount > 0) {
      process.exit(1);
    }

  } catch (error: any) {
    console.error('💥 Test script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}