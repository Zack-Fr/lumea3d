import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { StorageController, PublicStorageController } from './storage.controller';

@Module({
  imports: [ConfigModule],
  controllers: [StorageController, PublicStorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}