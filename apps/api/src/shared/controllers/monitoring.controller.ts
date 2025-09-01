import { Controller, Get, Header } from '@nestjs/common';
import { HealthService } from '../services/health.service';
import { MetricsService } from '../services/metrics.service';
import { LoggerService } from '../services/logger.service';
import { HealthCheck, SimpleHealth, SystemStatus, ReadinessCheck, LivenessCheck } from '../types/monitoring.types';

@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly healthService: HealthService,
    private readonly metricsService: MetricsService,
    private readonly logger: LoggerService,
  ) {}

  @Get('health')
  async getHealth(): Promise<HealthCheck> {
    try {
      const health = await this.healthService.getHealthCheck();
      
      // Log health check access
      this.logger.info('Health check requested', {
        status: health.status,
        checks: Object.keys(health.checks).length,
      });

      return health;
    } catch (error) {
      this.logger.error('Health check failed', error as Error);
      throw error;
    }
  }

  @Get('health/simple')
  async getSimpleHealth(): Promise<SimpleHealth> {
    try {
      const health = await this.healthService.getSimpleHealth();
      this.logger.debug('Simple health check requested');
      return health;
    } catch (error) {
      this.logger.error('Simple health check failed', error as Error);
      throw error;
    }
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    try {
      const metrics = await this.metricsService.getMetrics();
      this.logger.debug('Metrics requested', {
        size: metrics.length,
      });
      return metrics;
    } catch (error) {
      this.logger.error('Metrics collection failed', error as Error);
      throw error;
    }
  }

  @Get('status')
  getStatus(): SystemStatus {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    const status = {
      status: 'running',
      uptime: Math.floor(uptime),
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
      },
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString(),
    };

    this.logger.debug('Status requested', status);
    return status;
  }

  @Get('ready')
  async getReadiness(): Promise<ReadinessCheck> {
    try {
      // Check if all critical services are ready
      await this.healthService.getSimpleHealth();
      
      const readiness = {
        status: 'ready' as const,
        timestamp: new Date().toISOString(),
        checks: {
          database: 'ready',
          application: 'ready',
        },
      };

      this.logger.debug('Readiness check passed');
      return readiness;
    } catch (error) {
      this.logger.warn('Readiness check failed', error as Error);
      
      return {
        status: 'not_ready' as const,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  @Get('live')
  getLiveness(): LivenessCheck {
    // Simple liveness check - if the process is running, it's alive
    const liveness = {
      status: 'alive' as const,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };

    this.logger.debug('Liveness check passed');
    return liveness;
  }
}

export default MonitoringController;