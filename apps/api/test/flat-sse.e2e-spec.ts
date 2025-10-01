import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Flat SSE Route Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let userToken: string;
  let userId: string;
  let projectId: string;
  let sceneId: string;

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
        email: 'test-flat-sse@example.com',
        passwordHash: 'test',
      },
    });
    userId = user.id;

    // Create test project
    const project = await prisma.project.create({
      data: {
        name: 'Test Project for Flat SSE',
        userId: userId,
      },
    });
    projectId = project.id;

    // Create test scene
    const scene = await prisma.scene3D.create({
      data: {
        name: 'Test Scene for Flat SSE',
        projectId: projectId,
      },
    });
    sceneId = scene.id;

    // Generate JWT token
    userToken = jwtService.sign({ userId: userId });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.scene3D.deleteMany({ where: { id: sceneId } });
    await prisma.project.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email: 'test-flat-sse@example.com' } });
    await app.close();
  });

  describe('GET /scenes/:sceneId/events', () => {
    it('should establish SSE connection with authorization', async () => {
      const response = await request(app.getHttpServer())
        .get(`/scenes/${sceneId}/events`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect('Content-Type', 'text/event-stream; charset=utf-8');

      // Check SSE headers are set correctly
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.headers['connection']).toBe('keep-alive');
    });

    it('should reject unauthorized requests', async () => {
      await request(app.getHttpServer())
        .get(`/scenes/${sceneId}/events`)
        .expect(401);
    });

    it('should reject access to non-existent scene', async () => {
      const fakeSceneId = '00000000-0000-0000-0000-000000000000';
      
      await request(app.getHttpServer())
        .get(`/scenes/${fakeSceneId}/events`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should support Last-Event-ID header for reconnection', async () => {
      const lastEventId = 'test-event-123';
      
      const response = await request(app.getHttpServer())
        .get(`/scenes/${sceneId}/events`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Last-Event-ID', lastEventId)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/event-stream');
    });

    it('should support clientId query parameter', async () => {
      const clientId = 'test-client-123';
      
      await request(app.getHttpServer())
        .get(`/scenes/${sceneId}/events`)
        .query({ clientId })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });

  describe('Route Comparison with Nested SSE', () => {
    it('should have equivalent endpoints for nested and flat routes', async () => {
      // Test nested route
      const nestedResponse = await request(app.getHttpServer())
        .get(`/projects/${projectId}/scenes/${sceneId}/events`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Test flat route  
      const flatResponse = await request(app.getHttpServer())
        .get(`/scenes/${sceneId}/events`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Both should have SSE headers
      expect(nestedResponse.headers['content-type']).toContain('text/event-stream');
      expect(flatResponse.headers['content-type']).toContain('text/event-stream');
      expect(nestedResponse.headers['cache-control']).toBe('no-cache');
      expect(flatResponse.headers['cache-control']).toBe('no-cache');
    });
  });
});