import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScenesService } from './scenes.service';
import { ScenesController } from './scenes.controller';
import { FlatScenesController } from './flat-scenes.controller';
// import { ScenesGateway } from './scenes.gateway'; // DISABLED - conflicts with FlatScenesGateway
import { FlatScenesGateway } from './flat-scenes.gateway';
import { ScenesSSEController } from './scenes-sse.controller';
import { FlatScenesSSEController } from './flat-scenes-sse.controller';
import { DownloadService } from './download.service';
import { DownloadController } from './download.controller';
import { ValidationService } from '../shared/services/validation.service';
import { AuthzService } from '../shared/services/authz.service';
import { ScenesAuthGuard } from '../shared/guards/scenes-auth.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    AssetsModule,
    forwardRef(() => AuthModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ScenesController, FlatScenesController, ScenesSSEController, FlatScenesSSEController, DownloadController],
  providers: [
    ScenesService,
    DownloadService,
    ValidationService,
    AuthzService,
    ScenesAuthGuard,
    {
      provide: 'ScenesGateway',
      useClass: FlatScenesGateway, // Use FlatScenesGateway instead of ScenesGateway
    },
    FlatScenesGateway,
  ],
  exports: [ScenesService, FlatScenesGateway, DownloadService],
})
export class ScenesModule {}