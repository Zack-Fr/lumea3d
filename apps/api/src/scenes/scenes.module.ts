import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScenesService } from './scenes.service';
import { ScenesController } from './scenes.controller';
import { ScenesGateway } from './scenes.gateway';
import { ScenesSSEController } from './scenes-sse.controller';
import { DownloadService } from './download.service';
import { DownloadController } from './download.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    forwardRef(() => AuthModule),
    JwtModule.register({}), // Required for WsJwtGuard
  ],
  controllers: [ScenesController, ScenesSSEController, DownloadController],
  providers: [
    ScenesService,
    DownloadService,
    {
      provide: 'ScenesGateway',
      useClass: ScenesGateway,
    },
    ScenesGateway,
  ],
  exports: [ScenesService, ScenesGateway, DownloadService],
})
export class ScenesModule {}