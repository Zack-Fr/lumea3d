import { Module } from '@nestjs/common';
import { LoggerService } from './services/logger.service';
import { MetricsService } from './services/metrics.service';
import { HealthService } from './services/health.service';
import { MonitoringController } from './controllers/monitoring.controller';
import { MonitoringMiddleware } from './middleware/monitoring.middleware';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [
    LoggerService,
    MetricsService,
    HealthService,
    MonitoringMiddleware,
  ],
  controllers: [MonitoringController],
  exports: [
    LoggerService,
    MetricsService,
    HealthService,
    MonitoringMiddleware,
  ],
})
export class MonitoringModule {}

export default MonitoringModule;