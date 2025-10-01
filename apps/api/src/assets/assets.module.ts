import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { ProjectCategory3DController } from './project-category-3d.controller';
import { ProjectCategory3DService } from './project-category-3d.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { ProcessingModule } from '../processing/processing.module';

@Module({
  imports: [PrismaModule, StorageModule, ProcessingModule],
  controllers: [AssetsController, ProjectCategory3DController],
  providers: [AssetsService, ProjectCategory3DService],
  exports: [AssetsService, ProjectCategory3DService],
})
export class AssetsModule {}