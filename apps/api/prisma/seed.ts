import { AssetKey, PrismaClient } from '@prisma/client';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create demo users
  const adminPassword = await argon2Hash('admin123');
  const designerPassword = await argon2Hash('designer123');
  const clientPassword = await argon2Hash('client123');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@lumea.com' },
    update: {},
    create: {
      email: 'admin@lumea.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      displayName: 'Admin User',
    },
  });

  const designer = await prisma.user.upsert({
    where: { email: 'designer@lumea.com' },
    update: {},
    create: {
      email: 'designer@lumea.com',
      passwordHash: designerPassword,
      role: 'DESIGNER',
      displayName: 'Demo Designer',
    },
  });

  const client = await prisma.user.upsert({
    where: { email: 'client@lumea.com' },
    update: {},
    create: {
      email: 'client@lumea.com',
      passwordHash: clientPassword,
      role: 'CLIENT',
      displayName: 'Demo Client',
    },
  });

  console.log('Created demo users:', {
    admin: admin.email,
    designer: designer.email,
    client: client.email,
  });
  
  // Create demo project
  const demoProject = await prisma.project.upsert({
    where: { id: 'demo-project' },
    update: {},
    create: {
      id: 'demo-project',
      name: 'Demo Living Room',
      userId: designer.id,
    },
  });
  
  console.log('Created demo project:', demoProject.name);
  
  // Create demo scene
  const demoScene = await prisma.scene.upsert({
    where: { id: 'demo-scene' },
    update: {},
    create: {
      id: 'demo-scene',
      projectId: demoProject.id,
      version: 1,
      roomWCm: 500,
      roomHCm: 400,
      style: 'MODERN',
      seed: 12345,
      solverMs: 150,
      status: 'OK',
      rationale: {
        sofa: [
          'Positioned along the long wall for optimal seating arrangement',
          'Maintains required clearance from room boundaries',
        ],
        coffee_table: [
          'Centered relative to sofa for balanced layout',
          '50cm gap allows comfortable access while maintaining proximity',
        ],
        side_table: [
          'Adjacent to sofa arm for convenient access',
          'Aligned with sofa edge for visual cohesion',
        ],
      },
    },
  });
  
  console.log('Created demo scene:', demoScene.id);
  
  // Create demo 3D scene for WebSocket testing
  const demo3DScene = await prisma.scene3D.upsert({
    where: { id: 'demo-scene-3d' },
    update: {},
    create: {
      id: 'demo-scene-3d',
      name: 'Demo 3D Living Room',
      projectId: demoProject.id,
      version: 1,
      scale: 1.0,
      exposure: 1.2,
      envIntensity: 0.8,
      spawnPositionX: 0.0,
      spawnPositionY: 1.7,
      spawnPositionZ: 5.0,
      spawnYawDeg: 0.0,
    },
  });
  
  console.log('Created demo 3D scene:', demo3DScene.id);
  
  // Create demo 3D scene items
  const demo3DItems = [
    {
      id: 'demo-item-sofa',
      scene: { connect: { id: demo3DScene.id } },
      categoryKey: 'furniture_seating',
      model: 'modern_sofa',
      positionX: 2.5,
      positionY: 0.0,
      positionZ: 0.6,
      rotationX: 0.0,
      rotationY: 0.0,
      rotationZ: 0.0,
      scaleX: 1.0,
      scaleY: 1.0,
      scaleZ: 1.0,
    },
    {
      id: 'demo-item-table',
      scene: { connect: { id: demo3DScene.id } },
      categoryKey: 'furniture_tables',
      model: 'coffee_table',
      positionX: 2.5,
      positionY: 0.0,
      positionZ: 1.4,
      rotationX: 0.0,
      rotationY: 0.0,
      rotationZ: 0.0,
      scaleX: 1.0,
      scaleY: 1.0,
      scaleZ: 1.0,
    },
  ];

  for (const item of demo3DItems) {
    await prisma.sceneItem3D.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }

  console.log('Created demo 3D scene items');
  
  //Type demo project
  type PlacementSeedInput = {
    sceneId: string;
    assetKey: AssetKey;
    xCm: number;
    yCm: number;
    rotationDeg: number;
  };
  // Create demo placements
  const placements: PlacementSeedInput[] = [
    {
      sceneId: demoScene.id,
      assetKey: 'SOFA',
      xCm: 250,
      yCm: 60,
      rotationDeg: 0,
    },
    {
      sceneId: demoScene.id,
      assetKey: 'COFFEE_TABLE',
      xCm: 250,
      yCm: 140,
      rotationDeg: 0,
    },
    {
      sceneId: demoScene.id,
      assetKey: 'SIDE_TABLE',
      xCm: 360,
      yCm: 60,
      rotationDeg: 0,
    },
  ];

  for (const placement of placements) {
    const { sceneId, ...rest } = placement;

    await prisma.placement.upsert({
      where: {
        id: `demo-placement-${placement.assetKey.toLowerCase()}`,
      },
      update: {},
      create: {
        id: `demo-placement-${placement.assetKey.toLowerCase()}`,
        scene: {
          connect: {
            id: sceneId,
          },
        },
        ...rest,
      },
    });
  }

  console.log('Created demo placements');

  // Create demo compliance checks
  const complianceChecks = [
    {
      scene_id: demoScene.id,
      ruleKey: 'no-collision',
      passed: true,
      message: 'All furniture pieces have non-overlapping boundaries',
    },
    {
      sceneId: demoScene.id,
      ruleKey: 'sofa-front-walkway-60',
      passed: true,
      message: 'Clear walkway of 80cm maintained in front of sofa',
    },
    {
      sceneId: demoScene.id,
      ruleKey: 'coffee-centered-to-sofa',
      passed: true,
      message: 'Coffee table centered on sofa longitudinal axis with 50cm gap',
    },
    {
      sceneId: demoScene.id,
      ruleKey: 'side-table-adjacent',
      passed: true,
      message: 'Side table positioned within 10cm of sofa arm',
    },
  ];

  for (const check of complianceChecks) {
    const { sceneId, ...checkData } = check;
    await prisma.complianceCheck.upsert({
      where: {
        id: `demo-check-${check.ruleKey}`,
      },
      update: {},
      create: {
        id: `demo-check-${check.ruleKey}`,
        scene: { connect: { id: sceneId } },
        ...checkData,
      },
    });
  }

  console.log('Created demo compliance checks');

  // Create demo feedback
  await prisma.feedback.upsert({
    where: { id: 'demo-feedback' },
    update: {},
    create: {
      id: 'demo-feedback',
      sceneId: demoScene.id,
      userId: client.id,
      rating: 5,
      tags: ['modern', 'spacious', 'comfortable'],
      comment: 'Love this layout! The spacing feels perfect and very welcoming.',
      isPrivate: false,
    },
  });

  console.log('Created demo feedback');

  // Create demo assets for 3D categories
  const demoAssets = [
    {
      id: 'demo-asset-sofa',
      originalName: 'modern_sofa.glb',
      mimeType: 'model/gltf-binary',
      uploader: { connect: { id: designer.id } },
      status: 'READY' as const,
      originalUrl: '/assets/demo/modern_sofa.glb',
      meshoptUrl: '/assets/demo/modern_sofa_meshopt.glb',
      dracoUrl: '/assets/demo/modern_sofa_draco.glb',
      fileSize: 1024000,
    },
    {
      id: 'demo-asset-table',
      originalName: 'coffee_table.glb',
      mimeType: 'model/gltf-binary',
      uploader: { connect: { id: designer.id } },
      status: 'READY' as const,
      originalUrl: '/assets/demo/coffee_table.glb',
      meshoptUrl: '/assets/demo/coffee_table_meshopt.glb',
      dracoUrl: '/assets/demo/coffee_table_draco.glb',
      fileSize: 512000,
    },
    {
      id: 'demo-asset-lamp',
      originalName: 'floor_lamp.glb',
      mimeType: 'model/gltf-binary',
      uploader: { connect: { id: designer.id } },
      status: 'READY' as const,
      originalUrl: '/assets/demo/floor_lamp.glb',
      meshoptUrl: '/assets/demo/floor_lamp_meshopt.glb',
      dracoUrl: '/assets/demo/floor_lamp_draco.glb',
      fileSize: 256000,
    },
  ];

  for (const asset of demoAssets) {
    await prisma.asset.upsert({
      where: { id: asset.id },
      update: {},
      create: asset,
    });
  }

  console.log('Created demo assets');

  // Create demo project categories for 3D scene
  const demoCategories = [
    {
      id: 'demo-category-sofa',
      project: { connect: { id: demoProject.id } },
      categoryKey: 'furniture_seating',
      asset: { connect: { id: 'demo-asset-sofa' } },
      instancing: false,
      draco: true,
      meshopt: true,
      ktx2: false,
    },
    {
      id: 'demo-category-table',
      project: { connect: { id: demoProject.id } },
      categoryKey: 'furniture_tables',
      asset: { connect: { id: 'demo-asset-table' } },
      instancing: false,
      draco: true,
      meshopt: true,
      ktx2: false,
    },
    {
      id: 'demo-category-lamp',
      project: { connect: { id: demoProject.id } },
      categoryKey: 'lighting_floor',
      asset: { connect: { id: 'demo-asset-lamp' } },
      instancing: true,
      draco: true,
      meshopt: true,
      ktx2: false,
    },
  ];

  for (const category of demoCategories) {
    await prisma.projectCategory3D.upsert({
      where: { id: category.id },
      update: {},
      create: category,
    });
  }

  console.log('Created demo project categories');

  // Create demo placement adjustments for tracking user interactions
  const demoAdjustments = [
    {
      id: 'demo-adjustment-1',
      scene: { connect: { id: demo3DScene.id } },
      placement: { connect: { id: 'demo-placement-sofa' } },
      oldXCm: 240.0,
      oldYCm: 60.0,
      newXCm: 250.0,
      newYCm: 60.0,
      oldRotation: 0.0,
      newRotation: 0.0,
    },
    {
      id: 'demo-adjustment-2',
      scene: { connect: { id: demo3DScene.id } },
      placement: { connect: { id: 'demo-placement-coffee_table' } },
      oldXCm: 240.0,
      oldYCm: 140.0,
      newXCm: 250.0,
      newYCm: 140.0,
      oldRotation: 0.0,
      newRotation: 15.0,
    },
    {
      id: 'demo-adjustment-3',
      scene: { connect: { id: demo3DScene.id } },
      placement: { connect: { id: 'demo-placement-sofa' } },
      oldXCm: 250.0,
      oldYCm: 60.0,
      newXCm: 250.0,
      newYCm: 55.0,
      oldRotation: 0.0,
      newRotation: 0.0,
    },
  ];

  for (const adjustment of demoAdjustments) {
    await prisma.placementAdjustment.upsert({
      where: { id: adjustment.id },
      update: {},
      create: adjustment,
    });
  }

  console.log('Created demo placement adjustments');

  console.log('Database seed completed successfully!');
  console.log('\n Demo credentials:');
  console.log('Admin: admin@lumea.com / admin123');
  console.log('Designer: designer@lumea.com / designer123');
  console.log('Client: client@lumea.com / client123');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });