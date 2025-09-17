#!/usr/bin/env node

/**
 * Verify Test Data for Realtime
 * Check that all the required database records exist and are properly configured
 */

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function verifyTestData() {
  console.log('🔍 Verifying test data for realtime...');

  try {
    const testUserId = 'test-user-123';
    const testProjectId = 'test-project-123';
    const testSceneId = 'test-scene-123';
    const jwtSecret = 'dev-jwt-secret-change-in-production-12345';

    // 1. Verify user exists
    console.log('\n👤 Checking user...');
    const user = await prisma.user.findUnique({
      where: { id: testUserId },
      select: { id: true, displayName: true, email: true }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return false;
    }
    console.log(`✅ User found: ${user.displayName} (${user.id})`);

    // 2. Verify project exists
    console.log('\n📁 Checking project...');
    const project = await prisma.project.findUnique({
      where: { id: testProjectId },
      select: { id: true, name: true, userId: true }
    });
    
    if (!project) {
      console.log('❌ Project not found');
      return false;
    }
    console.log(`✅ Project found: ${project.name} (${project.id})`);
    console.log(`   Owner: ${project.userId}`);

    // 3. Verify scene exists
    console.log('\n🎬 Checking scene...');
    const scene = await prisma.scene3D.findUnique({
      where: { id: testSceneId },
      select: { id: true, name: true, projectId: true, version: true }
    });
    
    if (!scene) {
      console.log('❌ Scene not found');
      return false;
    }
    console.log(`✅ Scene found: ${scene.name} (${scene.id})`);
    console.log(`   Project ID: ${scene.projectId}`);
    console.log(`   Version: ${scene.version}`);

    // 4. Verify project membership
    console.log('\n👥 Checking project membership...');
    const membership = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: testUserId,
          projectId: testProjectId
        }
      },
      select: { userId: true, projectId: true, role: true }
    });
    
    if (!membership) {
      console.log('❌ Project membership not found');
      console.log('   User is not a member of the project!');
      return false;
    }
    console.log(`✅ Project membership found: ${membership.role}`);
    console.log(`   User ${testUserId} has ${membership.role} access to ${testProjectId}`);

    // 5. Verify JWT token
    console.log('\n🔑 Checking JWT token...');
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwibmFtZSI6IlRlc3QgVXNlciIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTc1Nzg3MzM4MiwiZXhwIjoxNzU3OTU5NzgyfQ.32_CeWR8wBXQyiUPqL2xMTM0aKjADZ_3RdPn8GfSjZ4';
    
    try {
      const decoded = jwt.verify(testToken, jwtSecret);
      console.log(`✅ JWT token is valid`);
      console.log(`   User ID: ${decoded.sub}`);
      console.log(`   Name: ${decoded.name}`);
      console.log(`   Expires: ${new Date(decoded.exp * 1000).toISOString()}`);
      console.log(`   Is Expired: ${Date.now() / 1000 > decoded.exp ? 'YES' : 'NO'}`);
    } catch (error) {
      console.log(`❌ JWT token verification failed: ${error.message}`);
      return false;
    }

    // 6. Test authorization logic manually
    console.log('\n🔐 Testing authorization logic...');
    
    // Check if user has project access (simulating the guard logic)
    const hasAccess = await testProjectAccess(testUserId, testProjectId);
    if (!hasAccess) {
      console.log('❌ Authorization test failed');
      return false;
    }
    console.log('✅ Authorization test passed');

    // 7. Summary
    console.log('\n🎉 All verification checks passed!');
    console.log('\n📋 Summary:');
    console.log(`   ✅ User: ${user.displayName} (${testUserId})`);
    console.log(`   ✅ Project: ${project.name} (${testProjectId})`);
    console.log(`   ✅ Scene: ${scene.name} (${testSceneId})`);
    console.log(`   ✅ Membership: ${membership.role} role`);
    console.log(`   ✅ JWT: Valid and not expired`);
    console.log(`   ✅ Authorization: User has access`);

    console.log('\n🔧 The database setup is correct. The realtime connection issue');
    console.log('   might be due to:');
    console.log('   1. Server not restarted after environment variable changes');
    console.log('   2. Different JWT secret in server vs. test');
    console.log('   3. Server-side error during authentication');

    return true;

  } catch (error) {
    console.error('❌ Error during verification:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function testProjectAccess(userId, projectId) {
  try {
    // This simulates the logic in AuthzService.userHasProjectAccess
    const member = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
      select: { role: true },
    });

    if (!member) {
      console.log('   ❌ User is not a member of this project');
      return false;
    }

    // For GET (read) access, all roles are allowed
    console.log(`   ✅ User has ${member.role} role - read access granted`);
    return true;
  } catch (error) {
    console.log(`   ❌ Authorization check failed: ${error.message}`);
    return false;
  }
}

if (require.main === module) {
  verifyTestData()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { verifyTestData };