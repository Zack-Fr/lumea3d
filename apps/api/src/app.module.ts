import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StorageModule } from './storage/storage.module';
import { ProcessingModule } from './processing/processing.module';
import { AssetsModule } from './assets/assets.module';
import { ScenesModule } from './scenes/scenes.module';
import { ProjectsModule } from './projects/projects.module';
import { MonitoringModule } from './shared/monitoring.module';
import { MonitoringMiddleware } from './shared/middleware/monitoring.middleware';
import { RealtimeModule } from './realtime/realtime.module';
import { CollaborationModule } from './collaboration/collaboration.module';

@Module({
  imports: [
    // Configuration module - load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 60, // 60 requests per minute per IP
    }]),
    
    // Job queue for background processing (skip in test environment)
    ...(process.env.NODE_ENV !== 'test' ? [
      BullModule.forRoot({
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD,
        },
      })
    ] : []),
    
    // Database module
    PrismaModule,
    
    // Monitoring and logging module
    MonitoringModule,
    
    // Authentication module
    AuthModule,
    
    // Users management module
    UsersModule,
    
    // Storage module for S3/MinIO integration
    StorageModule,
    
    // Processing module for 3D asset optimization
    ProcessingModule,
    
    // Assets module for upload/download management
    AssetsModule,
    
    // Scenes module for 3D scene management
    ScenesModule,
    
    // Projects module for project management
    ProjectsModule,
    
    // Realtime module for WebSocket and SSE collaboration features
    RealtimeModule,
    
    // Collaboration module for invitations and sessions
    CollaborationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply monitoring middleware to all routes except health checks
    consumer
      .apply(MonitoringMiddleware)
      .exclude('monitoring/(.*)') // Exclude monitoring endpoints to avoid recursive logging
      .forRoutes('*');
  }
}