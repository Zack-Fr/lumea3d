// Set NODE_ENV=test before any imports to ensure correct module loading
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/shared/filters/global-exception.filter';

let app: INestApplication;
let prisma: PrismaService;

export const setupTestApp = async (): Promise<INestApplication> => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        envFilePath: ['.env.test', '.env'],
        isGlobal: true,
      }),
      AppModule,
    ],
  }).compile();

  app = moduleFixture.createNestApplication();
  
  // Apply global pipes and filters
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  prisma = app.get(PrismaService);
  
  await app.init();
  
  return app;
};

export const cleanupTestData = async () => {
  if (prisma) {
    // Clean up test data in reverse dependency order
    await prisma.sceneItem3D.deleteMany({});
    await prisma.scene3D.deleteMany({});
    await prisma.projectCategory3D.deleteMany({});
    await prisma.asset.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.user.deleteMany({});
  }
};

export const teardownTestApp = async () => {
  if (app) {
    await app.close();
  }
};

export { app, prisma };
