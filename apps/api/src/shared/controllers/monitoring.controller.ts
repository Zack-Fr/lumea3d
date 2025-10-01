import { Controller, Get, Header, Optional, Inject } from '@nestjs/common';
import { HealthService } from '../services/health.service';
import { MetricsService } from '../services/metrics.service';
import { LoggerService } from '../services/logger.service';
import { HealthCheck, SimpleHealth, SystemStatus, ReadinessCheck, LivenessCheck } from '../types/monitoring.types';

@Controller('monitoring')
export class MonitoringController {
  private realtimeGateway: any = null;

  constructor(
    private readonly healthService: HealthService,
    private readonly metricsService: MetricsService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Set realtime gateway reference (called from realtime module)
   */
  setRealtimeGateway(gateway: any): void {
    this.realtimeGateway = gateway;
  }

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
      let metrics = await this.metricsService.getMetrics();
      
      // Add realtime metrics if available
      if (this.realtimeGateway && this.realtimeGateway.isHealthy()) {
        try {
          const rtMetrics = this.realtimeGateway.getMetrics();
          const realtimePrometheusMetrics = this.formatRealtimeMetricsForPrometheus(rtMetrics);
          metrics += '\n' + realtimePrometheusMetrics;
        } catch (error) {
          this.logger.warn('Failed to get realtime metrics', error as Error);
        }
      }
      
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

  /**
   * Simple health check endpoint as specified by realtime spec
   */
  @Get('healthz')
  async getHealthz(): Promise<{ status: string }> {
    try {
      await this.healthService.getSimpleHealth();
      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Healthz check failed', error as Error);
      return { status: 'error' };
    }
  }

  /**
   * Readiness check with WebSocket namespace verification
   */
  @Get('readyz')
  async getReadyz(): Promise<{ status: string; checks?: Record<string, string> }> {
    try {
      const checks: Record<string, string> = {};
      
      // Check database
      try {
        await this.healthService.getSimpleHealth();
        checks.database = 'ok';
      } catch (error) {
        checks.database = 'error';
      }
      
      // Check WebSocket namespace if available
      if (this.realtimeGateway) {
        checks.websocket_namespace = this.realtimeGateway.isHealthy() ? 'ok' : 'error';
      } else {
        checks.websocket_namespace = 'not_initialized';
      }
      
      // Check Redis (if used)
      checks.redis = 'ok'; // Simplified for now
      
      const hasErrors = Object.values(checks).some(status => status === 'error');
      
      return {
        status: hasErrors ? 'error' : 'ok',
        checks,
      };
    } catch (error) {
      this.logger.error('Readyz check failed', error as Error);
      return { status: 'error' };
    }
  }

  /**
   * Format realtime metrics for Prometheus
   */
  private formatRealtimeMetricsForPrometheus(rtMetrics: any): string {
    const lines: string[] = [];
    
    // Active connections
    lines.push('# HELP rt_active_connections Number of active realtime connections by scene');
    lines.push('# TYPE rt_active_connections gauge');
    if (rtMetrics.connections?.by_scene) {
      for (const [sceneId, count] of Object.entries(rtMetrics.connections.by_scene)) {
        lines.push(`rt_active_connections{scene_id="${sceneId}"} ${count}`);
      }
    }
    lines.push(`rt_active_connections_total ${rtMetrics.connections?.current || 0}`);
    
    // Messages in
    lines.push('# HELP rt_msgs_in_total Total number of messages received by type');
    lines.push('# TYPE rt_msgs_in_total counter');
    if (rtMetrics.messages_in_total) {
      for (const [type, count] of Object.entries(rtMetrics.messages_in_total)) {
        lines.push(`rt_msgs_in_total{type="${type}"} ${count}`);
      }
    }
    
    // Messages out
    lines.push('# HELP rt_msgs_out_total Total number of messages sent by type');
    lines.push('# TYPE rt_msgs_out_total counter');
    if (rtMetrics.messages_out_total) {
      for (const [type, count] of Object.entries(rtMetrics.messages_out_total)) {
        lines.push(`rt_msgs_out_total{type="${type}"} ${count}`);
      }
    }
    
    // Dropped messages
    lines.push('# HELP rt_dropped_total Total number of dropped messages by reason');
    lines.push('# TYPE rt_dropped_total counter');
    if (rtMetrics.dropped_messages_total) {
      for (const [reason, count] of Object.entries(rtMetrics.dropped_messages_total)) {
        lines.push(`rt_dropped_total{reason="${reason}"} ${count}`);
      }
    }
    
    // Camera coalesce
    lines.push('# HELP rt_camera_coalesce_total Total number of camera updates coalesced');
    lines.push('# TYPE rt_camera_coalesce_total counter');
    lines.push(`rt_camera_coalesce_total ${rtMetrics.camera_coalesce_total || 0}`);
    
    // Connection totals
    lines.push('# HELP rt_connections_total Total number of connections made');
    lines.push('# TYPE rt_connections_total counter');
    lines.push(`rt_connections_total ${rtMetrics.connections?.total || 0}`);
    
    lines.push('# HELP rt_disconnections_total Total number of disconnections');
    lines.push('# TYPE rt_disconnections_total counter');
    lines.push(`rt_disconnections_total ${rtMetrics.disconnections_total || 0}`);
    
    return lines.join('\n');
  }
}

export default MonitoringController;