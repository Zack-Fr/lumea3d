import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../app.module';

describe('Swagger docs visibility', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  }, 20000);

  afterAll(async () => {
    await app.close();
  });

  it('contains scenes categories path and proper server URL in generated OpenAPI doc', async () => {
    // Compute swagger base like main.ts
    let swaggerBase = process.env.API_PUBLIC_URL;
    try {
      // @ts-ignore
      const globalPrefix = (app as any).getGlobalPrefix?.();
      if (!swaggerBase && globalPrefix) {
        const prefix = globalPrefix.startsWith('/') ? globalPrefix : `/${globalPrefix}`;
        swaggerBase = `http://localhost:3000${prefix}`;
      }
    } catch (e) {
      // ignore
    }
    if (!swaggerBase) swaggerBase = 'http://localhost:3000';

    const config = new DocumentBuilder()
      .setTitle('Lumea API')
      .setVersion('1.0.0')
      .addServer(swaggerBase, 'Primary API Server')
      .build();

    const doc = SwaggerModule.createDocument(app, config);
    expect(doc).toHaveProperty('paths');
    expect(Object.keys(doc.paths)).toContain('/scenes/{sceneId}/categories');

    const servers = doc.servers || [];
    expect(servers.length).toBeGreaterThan(0);
    const urls = servers.map((s: any) => s.url);
    const ok = urls.some((u: string) => u.includes('localhost:3000') || (process.env.API_PUBLIC_URL && u.includes(process.env.API_PUBLIC_URL)) );
    expect(ok).toBeTruthy();
  }, 20000);
});
