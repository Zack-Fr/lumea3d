const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function create3DScene() {
  try {
    console.log('Creating 3D scene...');
    
    // Create demo 3D scene for WebSocket testing
    const demo3DScene = await prisma.scene3D.create({
      data: {
        id: 'demo-scene-3d',
        name: 'Demo 3D Living Room',
        project_id: 'demo-project',
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
      await prisma.sceneItem3D.create({
        data: item,
      });
    }

    console.log('Created demo 3D scene items');
    console.log('3D scene setup completed successfully!');
    
  } catch (error) {
    console.error('Error creating 3D scene:', error);
  } finally {
    await prisma.$disconnect();
  }
}

create3DScene();