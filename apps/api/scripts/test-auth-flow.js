#!/usr/bin/env node

/**
 * Test Authentication Flow
 * Directly test the authentication logic used by the WebSocket guard
 */

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function testAuthFlow() {
  console.log('🔍 Testing authentication flow for realtime...');

  try {
    // Test data
    const testUserId = 'test-user-123';
    const testProjectId = 'test-project-123';
    const testSceneId = 'test-scene-123';
    const jwtSecret = 'dev-jwt-secret-change-in-production-12345';
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwibmFtZSI6IlRlc3QgVXNlciIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTc1Nzg3MzM4MiwiZXhwIjoxNzU3OTU5NzgyfQ.32_CeWR8wBXQyiUPqL2xMTM0aKjADZ_3RdPn8GfSjZ4';

    console.log('\n🔑 Step 1: JWT Token Verification');
    console.log(`Token: ${testToken.substring(0, 30)}...`);
    console.log(`Secret: ${jwtSecret}`);

    let payload;
    try {
      payload = jwt.verify(testToken, jwtSecret);
      console.log('✅ JWT verification successful');
      console.log(`   User ID: ${payload.sub}`);
      console.log(`   Expires: ${new Date(payload.exp * 1000).toISOString()}`);
    } catch (jwtError) {
      console.log(`❌ JWT verification failed: ${jwtError.message}`);
      return;
    }

    const userId = payload.sub;

    console.log('\n🎬 Step 2: Scene Lookup');
    console.log(`Scene ID: ${testSceneId}`);

    let scene;
    try {
      scene = await prisma.scene3D.findUnique({
        where: { id: testSceneId },
        select: { projectId: true, name: true, version: true },
      });

      if (!scene) {
        console.log('❌ Scene not found in database');
        return;
      }

      console.log('✅ Scene found');
      console.log(`   Scene Name: ${scene.name}`);
      console.log(`   Project ID: ${scene.projectId}`);
      console.log(`   Version: ${scene.version}`);
    } catch (sceneError) {
      console.log(`❌ Scene lookup failed: ${sceneError.message}`);
      return;
    }

    console.log('\n👥 Step 3: Project Membership Check');
    console.log(`User ID: ${userId}`);
    console.log(`Project ID: ${scene.projectId}`);

    let membership;
    try {
      membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: userId,
            projectId: scene.projectId
          }
        },
        select: { role: true },
      });

      if (!membership) {
        console.log('❌ User is not a member of the project');
        console.log('   The authzService.userHasProjectAccess would return false');
        return;
      }

      console.log('✅ Project membership found');
      console.log(`   Role: ${membership.role}`);
      console.log('   ✅ Read access granted (all roles can read)');
    } catch (membershipError) {
      console.log(`❌ Membership lookup failed: ${membershipError.message}`);
      return;
    }

    console.log('\n👤 Step 4: User Info Lookup');
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, email: true },
      });

      if (!user) {
        console.log('❌ User not found in database');
        return;
      }

      console.log('✅ User info found');
      console.log(`   Display Name: ${user.displayName}`);
      console.log(`   Email: ${user.email}`);
    } catch (userError) {
      console.log(`❌ User lookup failed: ${userError.message}`);
      return;
    }

    console.log('\n🎉 Authentication Flow Test: PASSED');
    console.log('\n📋 Summary - All steps completed successfully:');
    console.log('   ✅ JWT token verification');
    console.log('   ✅ Scene exists in database');
    console.log('   ✅ User has project access');
    console.log('   ✅ User info available');
    console.log('\n🤔 Since the auth flow works, the issue might be:');
    console.log('   1. Server is using a different JWT secret');
    console.log('   2. There\'s an error in the WebSocket guard execution');
    console.log('   3. The client is sending the wrong parameters');

    console.log('\n🔧 Try restarting your API server to ensure environment variables are loaded:');
    console.log('   - Stop your current server (Ctrl+C)');
    console.log('   - Restart it to pick up the updated .env file');
    console.log('   - Then test the connection again');

  } catch (error) {
    console.error('❌ Unexpected error during auth flow test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testAuthFlow()
    .then(() => {
      console.log('\n✅ Auth flow test completed');
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testAuthFlow };