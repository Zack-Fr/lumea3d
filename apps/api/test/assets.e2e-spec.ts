import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { app } from './setup';
import { createTestUser, createTestProject, createMockGLBFile, waitForAsync } from './test-helpers';
import { AssetStatus } from '@prisma/client';
import { prisma } from './setup';

describe('Asset Upload Pipeline E2E', () => {
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

    describe('Asset Upload Flow', () => {
        it('should complete full asset upload pipeline', async () => {
        // Step 1: Request presigned upload URL
        const uploadRequest = {
            filename: 'test-chair.glb',
            contentType: 'model/gltf-binary',
            fileSize: 1024 * 1024, // 1MB
            category: 'office_furniture',
            metadata: { description: 'Test office chair model' }
        };

        const uploadUrlResponse = await request(testApp.getHttpServer())
        .post('/assets/upload-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send(uploadRequest)
        .expect(201);

        expect(uploadUrlResponse.body).toMatchObject({
        assetId: expect.any(String),
        uploadUrl: expect.any(String),
        fields: expect.any(Object),
        });

      const { assetId } = uploadUrlResponse.body;

      // Step 2: Verify asset was created in database with UPLOADED status
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
      });

      expect(asset).toMatchObject({
        id: assetId,
        uploaderId: userId,
        originalName: 'test-chair.glb',
        mimeType: 'model/gltf-binary',
        fileSize: 1024 * 1024,
        status: AssetStatus.UPLOADED,
      });

      // Step 3: Simulate upload completion callback
        const completionData = {
        assetId,
        success: true,
        processedUrls: {
            original: 'https://test-bucket/original/test-chair.glb',
            meshopt: 'https://test-bucket/meshopt/test-chair.glb',
            draco: 'https://test-bucket/draco/test-chair.glb',
        },
        metadata: {
          vertices: 1250,
          triangles: 800,
          materials: 2,
        }
      };

      await request(testApp.getHttpServer())
        .post(`/assets/${assetId}/upload-complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(completionData)
        .expect(200);

      // Step 4: Verify asset processing was triggered
      const processedAsset = await prisma.asset.findUnique({
        where: { id: assetId },
      });

      expect(processedAsset).toMatchObject({
        status: AssetStatus.PROCESSING,
        originalUrl: 'https://test-bucket/original/test-chair.glb',
      });

      // Step 5: Simulate processing completion
      await prisma.asset.update({
        where: { id: assetId },
        data: {
          status: AssetStatus.READY,
          meshoptUrl: 'https://test-bucket/meshopt/test-chair.glb',
          dracoUrl: 'https://test-bucket/draco/test-chair.glb',
          reportJson: {
            optimization: {
              originalSize: 1024 * 1024,
              meshoptSize: 512 * 1024,
              dracoSize: 256 * 1024,
              compressionRatio: 0.25,
            },
            quality: {
              vertices: 1250,
              triangles: 800,
              materials: 2,
            }
          },
        },
      });

      // Step 6: Create project category linking asset to project
      await request(testApp.getHttpServer())
        .post(`/projects/${projectId}/categories`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assetId,
          categoryKey: 'office_chairs',
          instancing: false,
          draco: true,
          meshopt: true,
          ktx2: true,
        })
        .expect(201);

      // Step 7: Verify category was created
      const category = await prisma.projectCategory3D.findFirst({
        where: {
          projectId: projectId,
          assetId: assetId,
          categoryKey: 'office_chairs',
        },
      });

      expect(category).toBeTruthy();
      expect(category).toMatchObject({
        projectId: projectId,
        assetId: assetId,
        categoryKey: 'office_chairs',
        draco: true,
        meshopt: true,
        ktx2: true,
      });

      // Step 8: Verify asset can be queried and downloaded
      const assetListResponse = await request(testApp.getHttpServer())
        .get('/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ category: 'office_chairs', status: 'READY' })
        .expect(200);

      expect(assetListResponse.body.assets).toHaveLength(1);
      expect(assetListResponse.body.assets[0]).toMatchObject({
        id: assetId,
        originalName: 'test-chair.glb',
        status: 'READY',
      });
    });

    it('should handle invalid asset upload requests', async () => {
      // Test invalid content type
      await request(testApp.getHttpServer())
        .post('/assets/upload-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'document.pdf',
          contentType: 'application/pdf', // Invalid for 3D assets
          fileSize: 1024 * 1024,
          category: 'office_furniture',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('File must be a valid 3D asset type');
        });

      // Test file too large
      await request(testApp.getHttpServer())
        .post('/assets/upload-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'huge-model.glb',
          contentType: 'model/gltf-binary',
          fileSize: 200 * 1024 * 1024, // 200MB - too large
          category: 'office_furniture',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('File size must not exceed 100MB');
        });

      // Test invalid category key
      await request(testApp.getHttpServer())
        .post('/assets/upload-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'model.glb',
          contentType: 'model/gltf-binary',
          fileSize: 1024 * 1024,
          category: 'Invalid Category!', // Invalid format
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Category key must be lowercase');
        });
    });

    it('should handle asset upload failure', async () => {
      // Step 1: Create asset for upload
      const uploadUrlResponse = await request(testApp.getHttpServer())
        .post('/assets/upload-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'test-model.glb',
          contentType: 'model/gltf-binary',
          fileSize: 1024 * 1024,
          category: 'test_furniture',
        })
        .expect(201);

      const { assetId } = uploadUrlResponse.body;

      // Step 2: Simulate upload failure
      await request(testApp.getHttpServer())
        .post(`/assets/${assetId}/upload-complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assetId,
          success: false,
          error: 'Upload failed due to network error',
        })
        .expect(200);

      // Step 3: Verify asset status was updated to FAILED
      const failedAsset = await prisma.asset.findUnique({
        where: { id: assetId },
      });

      expect(failedAsset?.status).toBe(AssetStatus.FAILED);
      expect(failedAsset?.errorMessage).toContain('Upload failed');
    });
  });

  describe('Asset Management', () => {
    it('should list assets with filtering and pagination', async () => {
      // Create multiple test assets
      const assets = await Promise.all([
        createMockAsset('chair-1.glb', 'office_chairs', AssetStatus.READY),
        createMockAsset('table-1.glb', 'office_tables', AssetStatus.READY),
        createMockAsset('lamp-1.glb', 'lighting', AssetStatus.PROCESSING),
      ]);

      // Test category filtering
      const chairsResponse = await request(testApp.getHttpServer())
        .get('/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ category: 'office_chairs' })
        .expect(200);

      expect(chairsResponse.body.assets).toHaveLength(1);
      expect(chairsResponse.body.assets[0].originalName).toBe('chair-1.glb');

      // Test status filtering
      const readyResponse = await request(testApp.getHttpServer())
        .get('/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'READY' })
        .expect(200);

      expect(readyResponse.body.assets).toHaveLength(2);

      // Test pagination
      const paginatedResponse = await request(testApp.getHttpServer())
        .get('/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 1, offset: 0 })
        .expect(200);

      expect(paginatedResponse.body.assets).toHaveLength(1);
      expect(paginatedResponse.body.pagination).toMatchObject({
        total: 3,
        limit: 1,
        offset: 0,
      });
    });
  });

  // Helper function to create mock assets
  async function createMockAsset(filename: string, category: string, status: AssetStatus) {
    return await prisma.asset.create({
      data: {
        uploaderId: userId,
        originalName: filename,
        mimeType: 'model/gltf-binary',
        fileSize: 1024 * 1024,
        status,
        originalUrl: `https://test-bucket/${filename}`,
        license: 'CC0',
      },
    });
  }
});