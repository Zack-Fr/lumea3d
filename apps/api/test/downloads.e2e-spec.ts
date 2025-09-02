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
} from './test-helpers';
import { prisma } from './setup';

describe('Asset Download E2E', () => {
  let testApp: INestApplication;
  let authToken: string;
  let userId: string;
  let projectId: string;
  let sceneId: string;
  let assetId: string;

  beforeEach(async () => {
    testApp = app;
    
    // Create test user and project
    const { user, token } = await createTestUser();
    const { project } = await createTestProject(user);
    const { scene } = await createTestScene(project, user);
    const { asset } = await createTestAsset(user, {
      status: 'READY',
      originalUrl: 'https://test-bucket/original/test-model.glb',
      meshoptUrl: 'https://test-bucket/meshopt/test-model.glb',
      dracoUrl: 'https://test-bucket/draco/test-model.glb',
    });
    
    authToken = token;
    userId = user.id;
    projectId = project.id;
    sceneId = scene.id;
    assetId = asset.id;

    // Create category linking asset to project
    await createTestCategory(project, asset, 'office_chairs');
    
    // Add scene item
    await createTestSceneItem(scene, 'office_chairs');
  });

  describe('Single Asset Download', () => {
    it('should generate presigned download URL for asset variants', async () => {
      // Test original asset download
      const originalResponse = await request(testApp.getHttpServer())
        .post(`/assets/${assetId}/download-url`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variant: 'original',
          cacheDuration: 3600,
          includeCdn: true,
        })
        .expect(200);

      expect(originalResponse.body).toMatchObject({
        assetId,
        variant: 'original',
        downloadUrl: expect.stringContaining('https://'),
        contentType: 'model/gltf-binary',
        fileSize: expect.any(Number),
        expiresAt: expect.any(String),
        cacheHeaders: {
          'Cache-Control': expect.any(String),
          ETag: expect.any(String),
          'Last-Modified': expect.any(String),
        },
      });

      // Test meshopt variant download
      const meshoptResponse = await request(testApp.getHttpServer())
        .post(`/assets/${assetId}/download-url`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variant: 'meshopt',
          cacheDuration: 7200,
        })
        .expect(200);

      expect(meshoptResponse.body).toMatchObject({
        assetId,
        variant: 'meshopt',
        downloadUrl: expect.stringContaining('meshopt'),
      });

      // Test draco variant download
      const dracoResponse = await request(testApp.getHttpServer())
        .post(`/assets/${assetId}/download-url`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variant: 'draco',
        })
        .expect(200);

      expect(dracoResponse.body).toMatchObject({
        assetId,
        variant: 'draco',
        downloadUrl: expect.stringContaining('draco'),
      });
    });

    it('should validate download URL requests', async () => {
      // Test invalid variant
      await request(testApp.getHttpServer())
        .post(`/assets/${assetId}/download-url`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variant: 'invalid_variant',
        })
        .expect(400);

      // Test invalid cache duration
      await request(testApp.getHttpServer())
        .post(`/assets/${assetId}/download-url`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variant: 'original',
          cacheDuration: 30, // Too short
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('minimum');
        });

      // Test cache duration too long
      await request(testApp.getHttpServer())
        .post(`/assets/${assetId}/download-url`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variant: 'original',
          cacheDuration: 100000, // Too long
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('maximum');
        });
    });

    it('should handle asset not found', async () => {
      await request(testApp.getHttpServer())
        .post('/assets/non-existent-id/download-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variant: 'original',
        })
        .expect(404);
    });

    it('should handle asset not ready for download', async () => {
      // Create asset with PROCESSING status
      const { asset: processingAsset } = await createTestAsset(undefined, {
        status: 'PROCESSING',
      });

      await request(testApp.getHttpServer())
        .post(`/assets/${processingAsset.id}/download-url`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variant: 'original',
        })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('not ready');
        });
    });
  });

  describe('Batch Scene Downloads', () => {
    it('should generate batch download for scene assets', async () => {
      // Create additional test assets and categories
      const { asset: asset2 } = await createTestAsset(undefined, {
        status: 'READY',
        originalName: 'table.glb',
        originalUrl: 'https://test-bucket/original/table.glb',
        meshoptUrl: 'https://test-bucket/meshopt/table.glb',
      });

      const { asset: asset3 } = await createTestAsset(undefined, {
        status: 'READY',
        originalName: 'lamp.glb',
        originalUrl: 'https://test-bucket/original/lamp.glb',
        dracoUrl: 'https://test-bucket/draco/lamp.glb',
      });

      // Create categories for additional assets
      await createTestCategory(
        await prisma.project.findUnique({ where: { id: projectId } })!,
        asset2,
        'office_tables'
      );
      
      await createTestCategory(
        await prisma.project.findUnique({ where: { id: projectId } })!,
        asset3,
        'lighting'
      );

      // Add scene items for the new assets
      await createTestSceneItem(
        await prisma.scene3D.findUnique({ where: { id: sceneId } })!,
        'office_tables'
      );
      await createTestSceneItem(
        await prisma.scene3D.findUnique({ where: { id: sceneId } })!,
        'lighting'
      );

      // Request batch download
      const batchResponse = await request(testApp.getHttpServer())
        .post(`/scenes/${sceneId}/download-batch`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryKeys: ['office_chairs', 'office_tables', 'lighting'],
          variant: 'meshopt',
          cacheDuration: 3600,
          includeCdn: true,
        })
        .expect(200);

      expect(batchResponse.body).toMatchObject({
        sceneId,
        sceneName: expect.any(String),
        assets: expect.any(Array),
        totalSize: expect.any(Number),
        assetCount: 3,
        generatedAt: expect.any(String),
      });

      // Verify each asset in the batch
      expect(batchResponse.body.assets).toHaveLength(3);
      
      const chairAsset = batchResponse.body.assets.find((a: any) => a.categoryKey === 'office_chairs');
      const tableAsset = batchResponse.body.assets.find((a: any) => a.categoryKey === 'office_tables');
      const lampAsset = batchResponse.body.assets.find((a: any) => a.categoryKey === 'lighting');

      expect(chairAsset).toMatchObject({
        assetId,
        categoryKey: 'office_chairs',
        filename: 'test-model.glb',
        downloadUrl: expect.stringContaining('meshopt'),
        variant: 'meshopt',
        contentType: 'model/gltf-binary',
      });

      expect(tableAsset).toMatchObject({
        assetId: asset2.id,
        categoryKey: 'office_tables',
        filename: 'table.glb',
        variant: 'meshopt',
      });

      expect(lampAsset).toMatchObject({
        assetId: asset3.id,
        categoryKey: 'lighting',
        filename: 'lamp.glb',
        variant: 'meshopt', // Should fallback since no meshopt URL
      });
    });

    it('should validate batch download requests', async () => {
      // Test invalid category keys
      await request(testApp.getHttpServer())
        .post(`/scenes/${sceneId}/download-batch`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryKeys: ['Invalid Category!'], // Invalid format
          variant: 'original',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Category key must be lowercase');
        });

      // Test empty category keys
      await request(testApp.getHttpServer())
        .post(`/scenes/${sceneId}/download-batch`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryKeys: [],
          variant: 'original',
        })
        .expect(400);

      // Test non-existent category
      await request(testApp.getHttpServer())
        .post(`/scenes/${sceneId}/download-batch`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryKeys: ['non_existent_category'],
          variant: 'original',
        })
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('Category not found');
        });
    });

    it('should handle partial batch success with some failed assets', async () => {
      // Create one ready asset and one failed asset
      const { asset: readyAsset } = await createTestAsset(undefined, {
        status: 'READY',
        originalName: 'ready-model.glb',
        originalUrl: 'https://test-bucket/ready-model.glb',
      });

      const { asset: failedAsset } = await createTestAsset(undefined, {
        status: 'FAILED',
        originalName: 'failed-model.glb',
        errorMessage: 'Processing failed',
      });

      // Create categories
      const project = await prisma.project.findUnique({ where: { id: projectId } })!;
      await createTestCategory(project, readyAsset, 'ready_category');
      await createTestCategory(project, failedAsset, 'failed_category');

      // Request batch with both categories
      const batchResponse = await request(testApp.getHttpServer())
        .post(`/scenes/${sceneId}/download-batch`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryKeys: ['ready_category', 'failed_category'],
          variant: 'original',
        })
        .expect(207); // Partial success

      expect(batchResponse.body).toMatchObject({
        sceneId,
        assets: expect.any(Array),
        errors: expect.any(Array),
        successCount: 1,
        errorCount: 1,
      });

      expect(batchResponse.body.assets).toHaveLength(1);
      expect(batchResponse.body.errors).toHaveLength(1);
      
      expect(batchResponse.body.errors[0]).toMatchObject({
        categoryKey: 'failed_category',
        error: expect.stringContaining('not ready'),
      });
    });
  });

  describe('Download Analytics and Caching', () => {
    it('should track download metrics', async () => {
      // Generate download URL
      await request(testApp.getHttpServer())
        .post(`/assets/${assetId}/download-url`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variant: 'original',
        })
        .expect(200);

      // Simulate download completion (this would normally be called by CDN webhook)
      await request(testApp.getHttpServer())
        .post(`/assets/${assetId}/download-complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variant: 'original',
          downloadedAt: new Date().toISOString(),
          bytesTransferred: 1024 * 1024,
          userAgent: 'Mozilla/5.0 Test Browser',
          clientIP: '127.0.0.1',
        })
        .expect(200);

      // Verify metrics were recorded (would typically be in a separate analytics table)
      // For this test, we just verify the endpoint accepts the data
    });

    it('should respect cache headers', async () => {
      const response = await request(testApp.getHttpServer())
        .post(`/assets/${assetId}/download-url`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variant: 'original',
          cacheDuration: 7200, // 2 hours
        })
        .expect(200);

      expect(response.body.cacheHeaders).toMatchObject({
        'Cache-Control': 'public, max-age=7200',
        ETag: expect.any(String),
        'Last-Modified': expect.any(String),
      });

      // Verify ETag is based on asset version/hash
      expect(response.body.cacheHeaders.ETag).toMatch(/^"[a-f0-9]+"/);
    });
  });
});