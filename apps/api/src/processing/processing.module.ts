import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ProcessingService } from './processing.service';
import { ProcessingQueueService } from './processing-queue.service';
import { AssetProcessingProcessor } from './asset-processing.processor';
import { StorageModule } from '../storage/storage.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    StorageModule,
    PrismaModule,
    BullModule.registerQueue({
      name: 'asset-processing',
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    }),
  ],
  providers: [ProcessingService, ProcessingQueueService, AssetProcessingProcessor],
  exports: [ProcessingService, ProcessingQueueService],
})
export class ProcessingModule {}