import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('Scenes alias /scenes/:sceneId/categories (smoke)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  }, 20000);

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 when unauthorized (guard wired)', async () => {
    await request(app.getHttpServer()).get('/scenes/invalid-scene-id/categories').expect(401);
  });
});
