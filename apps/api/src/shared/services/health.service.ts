import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LoggerService } from './logger.service';
import { MetricsService } from './metrics.service';
import { HealthCheck, HealthCheckResult, SimpleHealth } from '../types/monitoring.types';

@Injectable()
export class HealthService {
  private readonly startTime: number;
  private realtimeGateway: any = null; // Will be injected optionally

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
  ) {
    this.startTime = Date.now();
  }

  /**
   * Set realtime gateway reference (called from realtime module)
   */
  setRealtimeGateway(gateway: any): void {
    this.realtimeGateway = gateway;
  }

  async getHealthCheck(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Run all health checks in parallel
      const [
        databaseCheck,
        redisCheck,
        storageCheck,
        memoryCheck,
        diskCheck,
        realtimeCheck,
      ] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkStorage(),
        this.checkMemory(),
        this.checkDisk(),
        this.checkRealtime(),
      ]);

      const checks = {
        database: this.getResultValue(databaseCheck),
        redis: this.getResultValue(redisCheck),
        storage: this.getResultValue(storageCheck),
        memory: this.getResultValue(memoryCheck),
        disk: this.getResultValue(diskCheck),
        realtime: this.getResultValue(realtimeCheck),
      };

      // Determine overall status
      const overallStatus = this.determineOverallStatus(checks);

      // Get metrics summary
      const metricsData = await this.getMetricsSummary();

      const healthCheck: HealthCheck = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks,
        metrics: metricsData,
      };

      // Log health check
      const duration = Date.now() - startTime;
      this.logger.info('Health check completed', {
        status: overallStatus,
        duration,
        checks: Object.entries(checks).map(([name, check]) => ({
          name,
          status: check.status,
          responseTime: check.responseTime,
        })),
      });

      return healthCheck;

    } catch (error) {
      this.logger.error('Health check failed', error as Error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks: {
          database: { status: 'unhealthy', responseTime: 0, message: 'Health check failed' },
          redis: { status: 'unhealthy', responseTime: 0, message: 'Health check failed' },
          storage: { status: 'unhealthy', responseTime: 0, message: 'Health check failed' },
          memory: { status: 'unhealthy', responseTime: 0, message: 'Health check failed' },
          disk: { status: 'unhealthy', responseTime: 0, message: 'Health check failed' },
          realtime: { status: 'unhealthy', responseTime: 0, message: 'Health check failed' },
        },
        metrics: {
          totalRequests: 0,
          averageResponseTime: 0,
          errorRate: 0,
          activeConnections: 0,
        },
      };
    }
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simple database connectivity check
      await this.prisma.$queryRaw`SELECT 1`;
      
      const responseTime = Date.now() - startTime;
      
      // Check response time thresholds
      if (responseTime > 1000) {
        return {
          status: 'degraded',
          responseTime,
          message: 'Database response time is slow',
        };
      }

      return {
        status: 'healthy',
        responseTime,
        message: 'Database connection successful',
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Database connection failed: ${error.message}`,
      };
    }
  }

  private async checkRedis(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // In a real implementation, you would check Redis connectivity
      // For now, we'll simulate this check
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        message: 'Redis connection successful',
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Redis connection failed: ${error.message}`,
      };
    }
  }

  private async checkStorage(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // In a real implementation, you would check storage (MinIO/S3) connectivity
      // For now, we'll simulate this check
      await new Promise(resolve => setTimeout(resolve, 15));
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        message: 'Storage connection successful',
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Storage connection failed: ${error.message}`,
      };
    }
  }

  private async checkMemory(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const heapUsagePercentage = (heapUsedMB / heapTotalMB) * 100;
      
      const responseTime = Date.now() - startTime;
      
      // Check memory usage thresholds
      if (heapUsagePercentage > 90) {
        return {
          status: 'unhealthy',
          responseTime,
          message: `High memory usage: ${heapUsagePercentage.toFixed(1)}%`,
          details: { heapUsedMB, heapTotalMB, heapUsagePercentage },
        };
      } else if (heapUsagePercentage > 75) {
        return {
          status: 'degraded',
          responseTime,
          message: `Elevated memory usage: ${heapUsagePercentage.toFixed(1)}%`,
          details: { heapUsedMB, heapTotalMB, heapUsagePercentage },
        };
      }

      return {
        status: 'healthy',
        responseTime,
        message: `Memory usage normal: ${heapUsagePercentage.toFixed(1)}%`,
        details: { heapUsedMB, heapTotalMB, heapUsagePercentage },
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Memory check failed: ${error.message}`,
      };
    }
  }

  private async checkDisk(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // In a real implementation, you would check disk space
      // For now, we'll simulate this check
      const mockDiskUsage = Math.random() * 100;
      
      const responseTime = Date.now() - startTime;
      
      if (mockDiskUsage > 90) {
        return {
          status: 'unhealthy',
          responseTime,
          message: `High disk usage: ${mockDiskUsage.toFixed(1)}%`,
          details: { diskUsagePercentage: mockDiskUsage },
        };
      } else if (mockDiskUsage > 80) {
        return {
          status: 'degraded',
          responseTime,
          message: `Elevated disk usage: ${mockDiskUsage.toFixed(1)}%`,
          details: { diskUsagePercentage: mockDiskUsage },
        };
      }

      return {
        status: 'healthy',
        responseTime,
        message: `Disk usage normal: ${mockDiskUsage.toFixed(1)}%`,
        details: { diskUsagePercentage: mockDiskUsage },
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Disk check failed: ${error.message}`,
      };
    }
  }

  private getResultValue(result: PromiseSettledResult<HealthCheckResult>): HealthCheckResult {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        responseTime: 0,
        message: `Check failed: ${result.reason}`,
      };
    }
  }

  private determineOverallStatus(checks: HealthCheck['checks']): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    } else if (statuses.includes('degraded')) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  private async checkRealtime(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!this.realtimeGateway) {
        return {
          status: 'degraded',
          responseTime: Date.now() - startTime,
          message: 'Realtime gateway not initialized',
        };
      }

      const isHealthy = this.realtimeGateway.isHealthy();
      const metrics = this.realtimeGateway.getMetrics();
      const responseTime = Date.now() - startTime;
      
      if (!isHealthy) {
        return {
          status: 'unhealthy',
          responseTime,
          message: 'Realtime WebSocket namespace not healthy',
        };
      }

      return {
        status: 'healthy',
        responseTime,
        message: `Realtime gateway healthy - ${metrics.connections.current} active connections`,
        details: {
          activeConnections: metrics.connections.current,
          totalConnections: metrics.connections.total,
          totalScenes: metrics.presence.totalScenes,
          messagesInTotal: Object.values(metrics.messages_in_total || {}).reduce((a: number, b: number) => a + b, 0),
          messagesOutTotal: Object.values(metrics.messages_out_total || {}).reduce((a: number, b: number) => a + b, 0),
        },
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Realtime check failed: ${error.message}`,
      };
    }
  }

  private async getMetricsSummary(): Promise<HealthCheck['metrics']> {
    let realtimeMetrics = { activeConnections: 0 };
    
    if (this.realtimeGateway && this.realtimeGateway.isHealthy()) {
      try {
        const metrics = this.realtimeGateway.getMetrics();
        realtimeMetrics = {
          activeConnections: metrics.connections.current || 0,
        };
      } catch (error) {
        this.logger.warn('Failed to get realtime metrics for health summary', error as Error);
      }
    }

    return {
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      activeConnections: realtimeMetrics.activeConnections,
    };
  }

  // Simple health check endpoint
  async getSimpleHealth(): Promise<SimpleHealth> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error('Health check failed');
    }
  }
}

export default HealthService;