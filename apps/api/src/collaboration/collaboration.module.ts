import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { CollaborationService } from './collaboration.service';
import { CollaborationController } from './collaboration.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    forwardRef(() => RealtimeModule)
  ],
  controllers: [CollaborationController],
  providers: [CollaborationService],
  exports: [CollaborationService]
})
export class CollaborationModule {}
