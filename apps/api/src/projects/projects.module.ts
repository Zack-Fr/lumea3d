import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ThumbnailService } from './thumbnail.service';
import { ProjectsController } from './projects.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ThumbnailService],
  exports: [ProjectsService, ThumbnailService],
})
export class ProjectsModule {}
