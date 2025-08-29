import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StorageModule } from './storage/storage.module';
import { ProcessingModule } from './processing/processing.module';

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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}