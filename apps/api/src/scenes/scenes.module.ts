import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScenesService } from './scenes.service';
import { ScenesController } from './scenes.controller';
import { ScenesGateway } from './scenes.gateway';
import { ScenesSSEController } from './scenes-sse.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule),
    JwtModule.register({}), // Required for WsJwtGuard
  ],
  controllers: [ScenesController, ScenesSSEController],
  providers: [
    ScenesService,
    {
      provide: 'ScenesGateway',
      useClass: ScenesGateway,
    },
    ScenesGateway,
  ],
  exports: [ScenesService, ScenesGateway],
})
export class ScenesModule {}