import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create demo users
  const adminPassword = await argon2.hash('admin123');
  const designerPassword = await argon2.hash('designer123');
  const clientPassword = await argon2.hash('client123');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@lumea.com' },
    update: {},
    create: {
      email: 'admin@lumea.com',
      password_hash: adminPassword,
      role: 'ADMIN',
      display_name: 'Admin User',
    },
  });

  const designer = await prisma.user.upsert({
    where: { email: 'designer@lumea.com' },
    update: {},
    create: {
      email: 'designer@lumea.com',
      password_hash: designerPassword,
      role: 'DESIGNER',
      display_name: 'Demo Designer',
    },
  });

  const client = await prisma.user.upsert({
    where: { email: 'client@lumea.com' },
    update: {},
    create: {
      email: 'client@lumea.com',
      password_hash: clientPassword,
      role: 'CLIENT',
      display_name: 'Demo Client',
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

  // Create demo placements
  const placements = [
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
    await prisma.placement.upsert({
      where: {
        id: `demo-placement-${placement.asset_key.toLowerCase()}`,
      },
      update: {},
      create: {
        id: `demo-placement-${placement.asset_key.toLowerCase()}`,
        ...placement,
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