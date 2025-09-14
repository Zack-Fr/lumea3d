#!/usr/bin/env node

/**
 * Setup Test Data for Realtime Testing
 * Creates a test user, project, and scene for realtime functionality testing
 */

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function setupTestData() {
  console.log('🔧 Setting up test data for realtime testing...');

  try {
    // Test data configuration
    const testUserId = 'test-user-123';
    const testProjectId = 'test-project-123';
    const testSceneId = 'test-scene-123';
    const jwtSecret = 'dev-jwt-secret-change-in-production-12345';

    // 1. Create or update test user
    console.log('👤 Creating/updating test user...');
    const user = await prisma.user.upsert({
      where: { id: testUserId },
      update: {
        displayName: 'Test User',
        email: 'test@example.com',
      },
      create: {
        id: testUserId,
        displayName: 'Test User',
        email: 'test@example.com',
        passwordHash: 'dummy-hash', // Not used for JWT auth in this test
      },
    });
    console.log(`✅ User created/updated: ${user.displayName} (${user.id})`);

    // 2. Create or update test project
    console.log('📁 Creating/updating test project...');
    const project = await prisma.project.upsert({
      where: { id: testProjectId },
      update: {
        name: 'Test Project for Realtime',
      },
      create: {
        id: testProjectId,
        name: 'Test Project for Realtime',
        userId: testUserId,
      },
    });
    console.log(`✅ Project created/updated: ${project.name} (${project.id})`);

    // 3. Create or update test scene
    console.log('🎬 Creating/updating test scene...');
    const scene = await prisma.scene3D.upsert({
      where: { id: testSceneId },
      update: {
        name: 'Test Scene for Realtime',
        version: 1,
      },
      create: {
        id: testSceneId,
        name: 'Test Scene for Realtime',
        projectId: testProjectId,
        version: 1,
      },
    });
    console.log(`✅ Scene created/updated: ${scene.name} (${scene.id})`);

    // 4. Create or update project membership
    console.log('👥 Creating/updating project membership...');
    const membership = await prisma.projectMember.upsert({
      where: {
        userId_projectId: {
          userId: testUserId,
          projectId: testProjectId,
        },
      },
      update: {
        role: 'ADMIN',
      },
      create: {
        userId: testUserId,
        projectId: testProjectId,
        role: 'ADMIN',
      },
    });
    console.log(`✅ Project membership created/updated: ${testUserId} as ${membership.role} in ${testProjectId}`);

    // 5. Generate a fresh JWT token
    console.log('🔑 Generating JWT token...');
    const token = jwt.sign(
      {
        sub: testUserId,
        name: user.displayName,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      jwtSecret
    );

    console.log('\\n🎉 Test data setup complete!');
    console.log('\\n📋 Test Configuration:');
    console.log(`User ID: ${testUserId}`);
    console.log(`User Name: ${user.displayName}`);
    console.log(`Project ID: ${testProjectId}`);
    console.log(`Scene ID: ${testSceneId}`);
    console.log(`\\nJWT Token:`);
    console.log(token);

    console.log('\\n🚀 You can now use this data to test realtime connections!');
    console.log('\\nUpdate your test client with:');
    console.log(`- JWT_TOKEN: '${token}'`);
    console.log(`- SCENE_ID: '${testSceneId}'`);

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  setupTestData();
}

module.exports = { setupTestData };