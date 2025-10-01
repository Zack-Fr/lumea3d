import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ModuleRef } from '@nestjs/core';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuthzService } from '../shared/services/authz.service';
import { HealthService } from '../shared/services/health.service';
import { MonitoringController } from '../shared/controllers/monitoring.controller';

// Realtime components
import { RtGateway } from './gateway';
import { PresenceService } from './presence.service';
import { SseController } from './sse.controller';
import { RtWsGuard } from './guards/rt-ws.guard';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [SseController],
  providers: [
    RtGateway,
    PresenceService,
    RtWsGuard,
    AuthzService,
  ],
  exports: [RtGateway, PresenceService],
})
export class RealtimeModule implements OnModuleInit {
  constructor(private moduleRef: ModuleRef) {}

  async onModuleInit() {
    // Wire the realtime gateway to monitoring services
    try {
      const rtGateway = this.moduleRef.get(RtGateway, { strict: false });
      
      // Try to get health service and monitoring controller from the global context
      try {
        const healthService = this.moduleRef.get(HealthService, { strict: false });
        if (healthService && rtGateway) {
          healthService.setRealtimeGateway(rtGateway);
        }
      } catch (error) {
        console.warn('HealthService not available for realtime integration');
      }
      
      try {
        const monitoringController = this.moduleRef.get(MonitoringController, { strict: false });
        if (monitoringController && rtGateway) {
          monitoringController.setRealtimeGateway(rtGateway);
        }
      } catch (error) {
        console.warn('MonitoringController not available for realtime integration');
      }
      
    } catch (error) {
      console.error('Failed to wire realtime gateway to monitoring services:', error);
    }
  }
}
