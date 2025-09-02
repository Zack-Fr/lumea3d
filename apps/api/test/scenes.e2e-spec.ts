import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { app } from './setup';
import { 
  createTestUser, 
  createTestProject, 
  createTestAsset, 
  createTestScene,
  createTestCategory,
  createTestSceneItem,
  waitForAsync 
} from './test-helpers';
import { prisma } from './setup';

describe('Scenes Management E2E', () => {
  let testApp: INestApplication;
  let authToken: string;
  let userId: string;
  let projectId: string;

  beforeEach(async () => {
    testApp = app;
    
    // Create test user and project
    const { user, token } = await createTestUser();
    const { project } = await createTestProject(user);
    
    authToken = token;
    userId = user.id;
    projectId = project.id;
  });

  describe('Scene CRUD Operations', () => {
    it('should create, read, update, and delete 3D scenes', async () => {
      // Step 1: Create a new scene
      const createSceneRequest = {
        name: 'Living Room Scene',
        scale: 1.0,
        exposure: 1.2,
        envHdriUrl: 'https://example.com/hdri/livingroom.hdr',
        envIntensity: 1.5,
        spawnPositionX: 0,
        spawnPositionY: 1.7,
        spawnPositionZ: 5,
        spawnYawDeg: 0,
      };

      const createResponse = await request(testApp.getHttpServer())
        .post(`/projects/${projectId}/scenes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(createSceneRequest)
        .expect(201);

      expect(createResponse.body).toMatchObject({
        id: expect.any(String),
        name: 'Living Room Scene',
        version: 1,
        scale: 1.0,
        exposure: 1.2,
        envHdriUrl: 'https://example.com/hdri/livingroom.hdr',
        envIntensity: 1.5,
      });

      const sceneId = createResponse.body.id;

      // Step 2: Read the scene
      const getResponse = await request(testApp.getHttpServer())
        .get(`/scenes/${sceneId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body).toMatchObject({
        id: sceneId,
        name: 'Living Room Scene',
        version: 1,
        projectId: projectId,
      });

      // Step 3: Update the scene
      const updateRequest = {
        name: 'Updated Living Room',
        scale: 1.2,
        exposure: 1.0,
      };

      const updateResponse = await request(testApp.getHttpServer())
        .patch(`/scenes/${sceneId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateRequest)
        .expect(200);

      expect(updateResponse.body).toMatchObject({
        id: sceneId,
        name: 'Updated Living Room',
        scale: 1.2,
        exposure: 1.0,
        version: 2, // Version should increment
      });

      // Step 4: List scenes for project
      const listResponse = await request(testApp.getHttpServer())
        .get(`/projects/${projectId}/scenes`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.scenes).toHaveLength(1);
      expect(listResponse.body.scenes[0]).toMatchObject({
        id: sceneId,
        name: 'Updated Living Room',
      });

      // Step 5: Delete the scene
      await request(testApp.getHttpServer())
        .delete(`/scenes/${sceneId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify scene is deleted
      await request(testApp.getHttpServer())
        .get(`/scenes/${sceneId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should validate scene creation with invalid data', async () => {
      // Test invalid scale
      await request(testApp.getHttpServer())
        .post(`/projects/${projectId}/scenes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Scene',
          scale: 150, // Invalid - too large
          exposure: 1.0,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Scale factor must be between 0.01 and 100');
        });

      // Test invalid exposure
      await request(testApp.getHttpServer())
        .post(`/projects/${projectId}/scenes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Scene',
          scale: 1.0,
          exposure: 15, // Invalid - too high
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Exposure must be between -10 and 10 stops');
        });

      // Test invalid spawn position
      await request(testApp.getHttpServer())
        .post(`/projects/${projectId}/scenes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Scene',
          spawnPositionX: 2000, // Invalid - out of bounds
          spawnPositionY: 1.7,
          spawnPositionZ: 0,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Position coordinate must be between -1000 and 1000 meters');
        });
    });
  });

  describe('Scene Items Management', () => {
    let sceneId: string;
    let assetId: string;
    let categoryKey: string;

    beforeEach(async () => {
      // Create test scene and asset
      const { user } = await createTestUser({ id: userId });
      const { project } = await createTestProject(user);
      const { scene } = await createTestScene(project, user);
      const { asset } = await createTestAsset(user);
      
      sceneId = scene.id;
      assetId = asset.id;
      categoryKey = 'office_chairs';

      // Create project category
      await createTestCategory(project, asset, categoryKey);
    });

    it('should add, update, and remove scene items', async () => {
      // Step 1: Add scene item
      const addItemRequest = {
        categoryKey,
        model: 'chair_variant_01',
        positionX: 2.5,
        positionY: 0,
        positionZ: -1.5,
        rotationX: 0,
        rotationY: 45,
        rotationZ: 0,
        scaleX: 1.2,
        scaleY: 1.2,
        scaleZ: 1.2,
        materialVariant: 'leather_brown',
        selectable: true,
        locked: false,
        meta: { designer: 'john_doe' },
      };

      const addResponse = await request(testApp.getHttpServer())
        .post(`/scenes/${sceneId}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(addItemRequest)
        .expect(201);

      expect(addResponse.body).toMatchObject({
        id: expect.any(String),
        categoryKey: categoryKey,
        model: 'chair_variant_01',
        positionX: 2.5,
        positionY: 0,
        positionZ: -1.5,
        rotationY: 45,
        scaleX: 1.2,
        materialVariant: 'leather_brown',
      });

      const itemId = addResponse.body.id;

      // Step 2: Update scene item
      const updateItemRequest = {
        positionX: 3.0,
        positionY: 0,
        positionZ: -2.0,
        rotationY: 90,
        materialVariant: 'fabric_blue',
        locked: true,
      };

      const updateResponse = await request(testApp.getHttpServer())
        .patch(`/scenes/${sceneId}/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateItemRequest)
        .expect(200);

      expect(updateResponse.body).toMatchObject({
        id: itemId,
        positionX: 3.0,
        positionZ: -2.0,
        rotationY: 90,
        materialVariant: 'fabric_blue',
        locked: true,
      });

      // Step 3: Get scene items
      const itemsResponse = await request(testApp.getHttpServer())
        .get(`/scenes/${sceneId}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(itemsResponse.body.items).toHaveLength(1);
      expect(itemsResponse.body.items[0]).toMatchObject({
        id: itemId,
        categoryKey: categoryKey,
      });

      // Step 4: Remove scene item
      await request(testApp.getHttpServer())
        .delete(`/scenes/${sceneId}/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify item is removed
      const emptyResponse = await request(testApp.getHttpServer())
        .get(`/scenes/${sceneId}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(emptyResponse.body.items).toHaveLength(0);
    });

    it('should validate scene item constraints', async () => {
      // Test invalid position
      await request(testApp.getHttpServer())
        .post(`/scenes/${sceneId}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryKey,
          positionX: 1500, // Out of bounds
          positionY: 0,
          positionZ: 0,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Position coordinate must be between -1000 and 1000 meters');
        });

      // Test invalid rotation
      await request(testApp.getHttpServer())
        .post(`/scenes/${sceneId}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryKey,
          rotationX: 200, // Out of bounds
          rotationY: 0,
          rotationZ: 0,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Rotation angle must be between -180 and 180 degrees');
        });

      // Test invalid scale
      await request(testApp.getHttpServer())
        .post(`/scenes/${sceneId}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryKey,
          scaleX: 150, // Too large
          scaleY: 1,
          scaleZ: 1,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Scale factor must be between 0.01 and 100');
        });

      // Test invalid category key
      await request(testApp.getHttpServer())
        .post(`/scenes/${sceneId}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryKey: 'Invalid Category!', // Invalid format
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Category key must be lowercase');
        });
    });
  });

  describe('Scene Manifest Generation', () => {
    it('should generate proper scene manifest v2', async () => {
      // Create test data
      const { user } = await createTestUser({ id: userId });
      const { project } = await createTestProject(user);
      const { scene } = await createTestScene(project, user, {
        name: 'Test Manifest Scene',
        scale: 1.5,
        exposure: 1.2,
        envHdriUrl: 'https://example.com/test.hdr',
        envIntensity: 2.0,
      });
      const { asset } = await createTestAsset(user);
      
      // Create category and items
      await createTestCategory(project, asset, 'test_furniture');
      await createTestSceneItem(scene, 'test_furniture', {
        model: 'chair_01',
        positionX: 1.0,
        positionY: 0.0,
        positionZ: -2.0,
        rotationX: 0,
        rotationY: 45,
        rotationZ: 0,
        scaleX: 1.2,
        scaleY: 1.0,
        scaleZ: 1.2,
        materialVariant: 'wood_oak',
        selectable: true,
        locked: false,
      });

      // Generate manifest
      const manifestResponse = await request(testApp.getHttpServer())
        .get(`/scenes/${scene.id}/manifest`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(manifestResponse.body).toMatchObject({
        version: 2,
        scale: 1.5,
        exposure: 1.2,
        env: {
          hdri_url: 'https://example.com/test.hdr',
          intensity: 2.0,
        },
        spawn: {
          position: [expect.any(Number), expect.any(Number), expect.any(Number)],
          yawDeg: expect.any(Number),
        },
        navmeshUrl: expect.any(String),
        categories: {
          testFurniture: {
            glbUrl: expect.any(String),
            encodings: expect.any(Object),
            license: expect.any(String),
          },
        },
        items: [
          {
            id: expect.any(String),
            category: 'test_furniture',
            model: 'chair_01',
            transform: {
              position: [1.0, 0.0, -2.0],
              rotation_euler: [0, 45, 0],
              scale: [1.2, 1.0, 1.2],
            },
            material: {
              variant: 'wood_oak',
            },
            selectable: true,
            locked: false,
          },
        ],
      });
    });
  });
});