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
      user_id: designer.id,
    },
  });
  
  console.log('Created demo project:', demoProject.name);
  
  // Create demo scene
  const demoScene = await prisma.scene.upsert({
    where: { id: 'demo-scene' },
    update: {},
    create: {
      id: 'demo-scene',
      project_id: demoProject.id,
      version: 1,
      room_w_cm: 500,
      room_h_cm: 400,
      style: 'MODERN',
      seed: 12345,
      solver_ms: 150,
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
      project_id: demoProject.id,
      version: 1,
      scale: 1.0,
      exposure: 1.2,
      env_intensity: 0.8,
      spawn_position_x: 0.0,
      spawn_position_y: 1.7,
      spawn_position_z: 5.0,
      spawn_yaw_deg: 0.0,
    },
  });
  
  console.log('Created demo 3D scene:', demo3DScene.id);
  
  // Create demo 3D scene items
  const demo3DItems = [
    {
      id: 'demo-item-sofa',
      scene_id: demo3DScene.id,
      category_key: 'furniture',
      model: 'modern_sofa',
      position_x: 2.5,
      position_y: 0.0,
      position_z: 0.6,
      rotation_x: 0.0,
      rotation_y: 0.0,
      rotation_z: 0.0,
      scale_x: 1.0,
      scale_y: 1.0,
      scale_z: 1.0,
    },
    {
      id: 'demo-item-table',
      scene_id: demo3DScene.id,
      category_key: 'furniture',
      model: 'coffee_table',
      position_x: 2.5,
      position_y: 0.0,
      position_z: 1.4,
      rotation_x: 0.0,
      rotation_y: 0.0,
      rotation_z: 0.0,
      scale_x: 1.0,
      scale_y: 1.0,
      scale_z: 1.0,
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
    scene_id: string;
    asset_key: AssetKey;
    x_cm: number;
    y_cm: number;
    rotation_deg: number;
  };
  // Create demo placements
  const placements: PlacementSeedInput[] = [
    {
      scene_id: demoScene.id,
      asset_key: 'SOFA',
      x_cm: 250,
      y_cm: 60,
      rotation_deg: 0,
    },
    {
      scene_id: demoScene.id,
      asset_key: 'COFFEE_TABLE',
      x_cm: 250,
      y_cm: 140,
      rotation_deg: 0,
    },
    {
      scene_id: demoScene.id,
      asset_key: 'SIDE_TABLE',
      x_cm: 360,
      y_cm: 60,
      rotation_deg: 0,
    },
  ];

  for (const placement of placements) {
    const { scene_id, ...rest } = placement;

    await prisma.placement.upsert({
      where: {
        id: `demo-placement-${placement.asset_key.toLowerCase()}`,
      },
      update: {},
      create: {
        id: `demo-placement-${placement.asset_key.toLowerCase()}`,
        scene: {
          connect: {
            id: scene_id,
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
      rule_key: 'no-collision',
      passed: true,
      message: 'All furniture pieces have non-overlapping boundaries',
    },
    {
      scene_id: demoScene.id,
      rule_key: 'sofa-front-walkway-60',
      passed: true,
      message: 'Clear walkway of 80cm maintained in front of sofa',
    },
    {
      scene_id: demoScene.id,
      rule_key: 'coffee-centered-to-sofa',
      passed: true,
      message: 'Coffee table centered on sofa longitudinal axis with 50cm gap',
    },
    {
      scene_id: demoScene.id,
      rule_key: 'side-table-adjacent',
      passed: true,
      message: 'Side table positioned within 10cm of sofa arm',
    },
  ];

  for (const check of complianceChecks) {
    await prisma.complianceCheck.upsert({
      where: {
        id: `demo-check-${check.rule_key}`,
      },
      update: {},
      create: {
        id: `demo-check-${check.rule_key}`,
        ...check,
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
      scene_id: demoScene.id,
      user_id: client.id,
      rating: 5,
      tags: ['modern', 'spacious', 'comfortable'],
      comment: 'Love this layout! The spacing feels perfect and very welcoming.',
      is_private: false,
    },
  });

  console.log('Created demo feedback');

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