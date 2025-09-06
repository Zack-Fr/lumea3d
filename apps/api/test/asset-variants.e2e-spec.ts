import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Asset Variants (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let userToken: string;
  let userId: string;
  let assetId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    
    await app.init();

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test-asset-variants@example.com',
        passwordHash: 'test',
      },
    });
    userId = user.id;

    // Create test asset with all variants
    const asset = await prisma.asset.create({
      data: {
        uploaderId: userId,
        originalName: 'test-model.glb',
        mimeType: 'model/gltf-binary',
        fileSize: 1024,
        status: 'READY',
        originalUrl: 'https://example.com/original.glb',
        meshoptUrl: 'https://example.com/meshopt.glb',
        dracoUrl: 'https://example.com/draco.glb',
        ktx2Url: 'https://example.com/textures.ktx2',
        navmeshUrl: 'https://example.com/navmesh.glb',
      },
    });
    assetId = asset.id;

    // Generate JWT token
    userToken = jwtService.sign({ userId: userId });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.asset.deleteMany({ where: { uploaderId: userId } });
    await prisma.user.deleteMany({ where: { email: 'test-asset-variants@example.com' } });
    await app.close();
  });

  describe('GET /assets/:id', () => {
    it('should return asset with convenient urls map', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assets/${assetId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('urls');
      expect(response.body.urls).toEqual({
        original: 'https://example.com/original.glb',
        meshopt: 'https://example.com/meshopt.glb',
        draco: 'https://example.com/draco.glb',
        ktx2: 'https://example.com/textures.ktx2',
        navmesh: 'https://example.com/navmesh.glb',
      });

      // Should also include all other asset properties
      expect(response.body).toHaveProperty('id', assetId);
      expect(response.body).toHaveProperty('status', 'READY');
      expect(response.body).toHaveProperty('originalName', 'test-model.glb');
    });

    it('should return only available URLs', async () => {
      // Create asset with only some variants
      const partialAsset = await prisma.asset.create({
        data: {
          uploaderId: userId,
          originalName: 'partial-model.glb',
          mimeType: 'model/gltf-binary',
          fileSize: 1024,
          status: 'PROCESSING',
          originalUrl: 'https://example.com/partial-original.glb',
          // No other variants
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/assets/${partialAsset.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.urls).toEqual({
        original: 'https://example.com/partial-original.glb',
      });

      // Clean up
      await prisma.asset.delete({ where: { id: partialAsset.id } });
    });
  });

  describe('GET /assets/:id/variants', () => {
    it('should return list of available variants', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assets/${assetId}/variants`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.variants).toEqual([
        { type: 'original', url: 'https://example.com/original.glb', available: true },
        { type: 'meshopt', url: 'https://example.com/meshopt.glb', available: true },
        { type: 'draco', url: 'https://example.com/draco.glb', available: true },
        { type: 'navmesh', url: 'https://example.com/navmesh.glb', available: true },
        { type: 'ktx2', url: 'https://example.com/textures.ktx2', available: true },
      ]);
    });
  });

  describe('GET /assets/:id/status', () => {
    it('should return processing status with all variant URLs', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assets/${assetId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: assetId,
        status: 'READY',
        originalUrl: 'https://example.com/original.glb',
        meshoptUrl: 'https://example.com/meshopt.glb',
        dracoUrl: 'https://example.com/draco.glb',
        ktx2Url: 'https://example.com/textures.ktx2',
        navmeshUrl: 'https://example.com/navmesh.glb',
        errorMessage: null,
      });
    });
  });

  describe('POST /assets/:id/download-url', () => {
    it('should generate download URLs for all variant types', async () => {
      const variants = ['original', 'meshopt', 'draco', 'ktx2', 'navmesh'];
      
      for (const variant of variants) {
        const response = await request(app.getHttpServer())
          .post(`/assets/${assetId}/download-url?variant=${variant}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ expiresIn: 3600 })
          .expect(200);

        expect(response.body).toHaveProperty('downloadUrl');
        expect(response.body).toHaveProperty('expiresIn', 3600);
      }
    });

    it('should reject unavailable variant types', async () => {
      // Create asset without KTX2 variant
      const noKtx2Asset = await prisma.asset.create({
        data: {
          uploaderId: userId,
          originalName: 'no-ktx2.glb',
          mimeType: 'model/gltf-binary',
          fileSize: 1024,
          status: 'READY',
          originalUrl: 'https://example.com/no-ktx2.glb',
          // No ktx2Url
        },
      });

      await request(app.getHttpServer())
        .post(`/assets/${noKtx2Asset.id}/download-url?variant=ktx2`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ expiresIn: 3600 })
        .expect(400);

      // Clean up
      await prisma.asset.delete({ where: { id: noKtx2Asset.id } });
    });
  });
});