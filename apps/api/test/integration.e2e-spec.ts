import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { app } from './setup';
import { createTestUser, waitForAsync } from './test-helpers';
import { AssetStatus } from '@prisma/client';
import { prisma } from './setup';

describe('Full Workflow Integration E2E', () => {
  let testApp: INestApplication;
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    testApp = app;
    
    // Create test user
    const { user, token } = await createTestUser({ role: 'DESIGNER' });
    authToken = token;
    userId = user.id;
  });

  describe('Complete 3D Asset Workflow', () => {
    it('should complete full workflow from project creation to scene download', async () => {
      // Step 1: Create a project
      const projectResponse = await request(testApp.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Office Design Project',
        })
        .expect(201);

      const projectId = projectResponse.body.id;
      expect(projectResponse.body).toMatchObject({
        id: projectId,
        name: 'Office Design Project',
        user_id: userId,
      });

      // Step 2: Upload multiple assets
      const chairUploadResponse = await request(testApp.getHttpServer())
        .post('/assets/upload-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'office-chair.glb',
          contentType: 'model/gltf-binary',
          fileSize: 2 * 1024 * 1024, // 2MB
          category: 'office_chairs',
          metadata: { type: 'ergonomic', material: 'fabric' },
        })
        .expect(201);

      const tableUploadResponse = await request(testApp.getHttpServer())
        .post('/assets/upload-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'office-table.glb',
          contentType: 'model/gltf-binary',
          fileSize: 3 * 1024 * 1024, // 3MB
          category: 'office_tables',
        })
        .expect(201);

      const chairAssetId = chairUploadResponse.body.assetId;
      const tableAssetId = tableUploadResponse.body.assetId;

      // Step 3: Simulate successful asset processing
      await prisma.asset.update({
        where: { id: chairAssetId },
        data: {
          status: AssetStatus.READY,
          originalUrl: 'https://test-bucket/original/office-chair.glb',
          meshoptUrl: 'https://test-bucket/meshopt/office-chair.glb',
          dracoUrl: 'https://test-bucket/draco/office-chair.glb',
          reportJson: {
            optimization: { compressionRatio: 0.3 },
            quality: { vertices: 1500, triangles: 1000 },
          },
        },
      });

      await prisma.asset.update({
        where: { id: tableAssetId },
        data: {
          status: AssetStatus.READY,
          originalUrl: 'https://test-bucket/original/office-table.glb',
          meshoptUrl: 'https://test-bucket/meshopt/office-table.glb',
          dracoUrl: 'https://test-bucket/draco/office-table.glb',
        },
      });

      // Step 4: Create project categories
      await request(testApp.getHttpServer())
        .post(`/projects/${projectId}/categories`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assetId: chairAssetId,
          categoryKey: 'office_chairs',
          instancing: true,
          draco: true,
          meshopt: true,
          ktx2: false,
        })
        .expect(201);

      await request(testApp.getHttpServer())
        .post(`/projects/${projectId}/categories`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assetId: tableAssetId,
          categoryKey: 'office_tables',
          instancing: false,
          draco: true,
          meshopt: true,
          ktx2: true,
        })
        .expect(201);

      // Step 5: Create a 3D scene
      const sceneResponse = await request(testApp.getHttpServer())
        .post(`/projects/${projectId}/scenes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Office Layout V1',
          scale: 1.0,
          exposure: 1.1,
          envHdriUrl: 'https://example.com/office-env.hdr',
          envIntensity: 1.2,
          spawnPositionX: 0,
          spawnPositionY: 1.7,
          spawnPositionZ: 8,
          spawnYawDeg: 0,
        })
        .expect(201);

      const sceneId = sceneResponse.body.id;
      expect(sceneResponse.body).toMatchObject({
        id: sceneId,
        name: 'Office Layout V1',
        version: 1,
        project_id: projectId,
      });

      // Step 6: Add scene items
      const chairItemResponse = await request(testApp.getHttpServer())
        .post(`/scenes/${sceneId}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryKey: 'office_chairs',
          model: 'ergonomic_v1',
          positionX: 2.0,
          positionY: 0.0,
          positionZ: -1.0,
          rotationX: 0,
          rotationY: 45,
          rotationZ: 0,
          scaleX: 1.0,
          scaleY: 1.0,
          scaleZ: 1.0,
          materialVariant: 'fabric_blue',
          selectable: true,
          locked: false,
          meta: { zone: 'workspace_1' },
        })
        .expect(201);

      const tableItemResponse = await request(testApp.getHttpServer())
        .post(`/scenes/${sceneId}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryKey: 'office_tables',
          model: 'standard_desk',
          positionX: 0.0,
          positionY: 0.0,
          positionZ: 0.0,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          scaleX: 1.2,
          scaleY: 1.0,
          scaleZ: 1.2,
          materialVariant: 'wood_oak',
          selectable: true,
          locked: false,
        })
        .expect(201);

      const chairItemId = chairItemResponse.body.id;
      const tableItemId = tableItemResponse.body.id;

      // Step 7: Update scene items
      await request(testApp.getHttpServer())
        .patch(`/scenes/${sceneId}/items/${chairItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          positionX: 2.5,
          positionZ: -1.5,
          rotationY: 90,
          materialVariant: 'fabric_red',
        })
        .expect(200);

      // Step 8: Generate scene manifest
      const manifestResponse = await request(testApp.getHttpServer())
        .get(`/scenes/${sceneId}/manifest`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(manifestResponse.body).toMatchObject({
        version: 2,
        scale: 1.0,
        exposure: 1.1,
        env: {
          hdri_url: 'https://example.com/office-env.hdr',
          intensity: 1.2,
        },
        spawn: {
          position: [0, 1.7, 8],
          yaw_deg: 0,
        },
        categories: {
          office_chairs: {
            glb_url: expect.any(String),
            encodings: {
              meshopt_url: expect.any(String),
              draco_url: expect.any(String),
            },
            instancing: true,
            draco: true,
            meshopt: true,
            ktx2: false,
            license: expect.any(String),
          },
          office_tables: {
            glb_url: expect.any(String),
            encodings: {
              meshopt_url: expect.any(String),
              draco_url: expect.any(String),
            },
            instancing: false,
            draco: true,
            meshopt: true,
            ktx2: true,
            license: expect.any(String),
          },
        },
        items: [
          {
            id: chairItemId,
            category: 'office_chairs',
            model: 'ergonomic_v1',
            transform: {
              position: [2.5, 0.0, -1.5], // Updated position
              rotation_euler: [0, 90, 0], // Updated rotation
              scale: [1.0, 1.0, 1.0],
            },
            material: {
              variant: 'fabric_red', // Updated material
            },
            selectable: true,
            locked: false,
            meta: { zone: 'workspace_1' },
          },
          {
            id: tableItemId,
            category: 'office_tables',
            model: 'standard_desk',
            transform: {
              position: [0.0, 0.0, 0.0],
              rotation_euler: [0, 0, 0],
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

      // Step 9: Generate batch download
      const downloadResponse = await request(testApp.getHttpServer())
        .post(`/scenes/${sceneId}/download-batch`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryKeys: ['office_chairs', 'office_tables'],
          variant: 'meshopt',
          cacheDuration: 3600,
          includeCdn: true,
        })
        .expect(200);

      expect(downloadResponse.body).toMatchObject({
        sceneId,
        sceneName: 'Office Layout V1',
        assets: expect.arrayContaining([
          expect.objectContaining({
            assetId: chairAssetId,
            categoryKey: 'office_chairs',
            variant: 'meshopt',
            downloadUrl: expect.stringContaining('meshopt'),
          }),
          expect.objectContaining({
            assetId: tableAssetId,
            categoryKey: 'office_tables',
            variant: 'meshopt',
            downloadUrl: expect.stringContaining('meshopt'),
          }),
        ]),
        assetCount: 2,
        totalSize: expect.any(Number),
      });

      // Step 10: Update scene version and verify version tracking
      await request(testApp.getHttpServer())
        .patch(`/scenes/${sceneId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Office Layout V2',
          exposure: 1.3,
        })
        .expect(200);

      const updatedScene = await prisma.scene3D.findUnique({
        where: { id: sceneId },
      });

      expect(updatedScene?.version).toBe(2);
      expect(updatedScene?.name).toBe('Office Layout V2');
      expect(updatedScene?.exposure).toBe(1.3);

      // Step 11: Verify complete project structure
      const finalProjectResponse = await request(testApp.getHttpServer())
        .get(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalProjectResponse.body).toMatchObject({
        id: projectId,
        name: 'Office Design Project',
        scenes: expect.arrayContaining([
          expect.objectContaining({
            id: sceneId,
            name: 'Office Layout V2',
            version: 2,
          }),
        ]),
        categories: expect.arrayContaining([
          expect.objectContaining({
            category_key: 'office_chairs',
            asset_id: chairAssetId,
          }),
          expect.objectContaining({
            category_key: 'office_tables',
            asset_id: tableAssetId,
          }),
        ]),
        assetCount: 2,
        sceneCount: 1,
      });
    });

    it('should handle error scenarios gracefully', async () => {
      // Create project
      const projectResponse = await request(testApp.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Error Test Project' })
        .expect(201);

      const projectId = projectResponse.body.id;

      // Try to create scene with invalid data
      await request(testApp.getHttpServer())
        .post(`/projects/${projectId}/scenes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Invalid - empty name
          scale: 200, // Invalid - too large
          spawnPositionX: 5000, // Invalid - out of bounds
        })
        .expect(400);

      // Create valid scene
      const sceneResponse = await request(testApp.getHttpServer())
        .post(`/projects/${projectId}/scenes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Valid Scene',
          scale: 1.0,
        })
        .expect(201);

      const sceneId = sceneResponse.body.id;

      // Try to add item with non-existent category
      await request(testApp.getHttpServer())
        .post(`/scenes/${sceneId}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryKey: 'non_existent_category',
          positionX: 0,
          positionY: 0,
          positionZ: 0,
        })
        .expect(404);

      // Try to generate manifest for scene with no items
      const emptyManifestResponse = await request(testApp.getHttpServer())
        .get(`/scenes/${sceneId}/manifest`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(emptyManifestResponse.body).toMatchObject({
        version: 2,
        items: [],
        categories: {},
      });

      // Try to download batch with no categories
      await request(testApp.getHttpServer())
        .post(`/scenes/${sceneId}/download-batch`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryKeys: ['non_existent'],
          variant: 'original',
        })
        .expect(404);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent operations', async () => {
      // Create project
      const projectResponse = await request(testApp.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Performance Test Project' })
        .expect(201);

      const projectId = projectResponse.body.id;

      // Create scene
      const sceneResponse = await request(testApp.getHttpServer())
        .post(`/projects/${projectId}/scenes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Performance Test Scene',
          scale: 1.0,
        })
        .expect(201);

      const sceneId = sceneResponse.body.id;

      // Create multiple assets concurrently
      const assetCreationPromises = Array.from({ length: 5 }, (_, i) =>
        request(testApp.getHttpServer())
          .post('/assets/upload-url')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            filename: `test-asset-${i}.glb`,
            contentType: 'model/gltf-binary',
            fileSize: 1024 * 1024,
            category: `test_category_${i}`,
          })
          .expect(201)
      );

      const assetResponses = await Promise.all(assetCreationPromises);
      expect(assetResponses).toHaveLength(5);

      // Mark all assets as ready
      await Promise.all(
        assetResponses.map(response =>
          prisma.asset.update({
            where: { id: response.body.assetId },
            data: {
              status: AssetStatus.READY,
              originalUrl: `https://test-bucket/asset-${response.body.assetId}.glb`,
            },
          })
        )
      );

      // Create categories concurrently
      const categoryPromises = assetResponses.map((response, i) =>
        request(testApp.getHttpServer())
          .post(`/projects/${projectId}/categories`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            assetId: response.body.assetId,
            categoryKey: `test_category_${i}`,
            draco: true,
            meshopt: true,
          })
          .expect(201)
      );

      await Promise.all(categoryPromises);

      // Add multiple scene items concurrently
      const itemPromises = Array.from({ length: 5 }, (_, i) =>
        request(testApp.getHttpServer())
          .post(`/scenes/${sceneId}/items`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            categoryKey: `test_category_${i}`,
            positionX: i * 2,
            positionY: 0,
            positionZ: 0,
          })
          .expect(201)
      );

      const itemResponses = await Promise.all(itemPromises);
      expect(itemResponses).toHaveLength(5);

      // Generate manifest with multiple items
      const manifestResponse = await request(testApp.getHttpServer())
        .get(`/scenes/${sceneId}/manifest`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(manifestResponse.body.items).toHaveLength(5);
      expect(Object.keys(manifestResponse.body.categories)).toHaveLength(5);

      // Test batch download with all categories
      const downloadResponse = await request(testApp.getHttpServer())
        .post(`/scenes/${sceneId}/download-batch`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryKeys: Array.from({ length: 5 }, (_, i) => `test_category_${i}`),
          variant: 'original',
        })
        .expect(200);

      expect(downloadResponse.body.assets).toHaveLength(5);
      expect(downloadResponse.body.assetCount).toBe(5);
    });
  });
});