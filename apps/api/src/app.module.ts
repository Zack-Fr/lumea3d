import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StorageModule } from './storage/storage.module';
import { ProcessingModule } from './processing/processing.module';
import { AssetsModule } from './assets/assets.module';

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
    
    // Job queue for background processing
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
      },
    }),
    
    // Database module
    PrismaModule,
    
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}