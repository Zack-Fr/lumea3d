import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { LoggerService } from '../src/shared/services/logger.service';
import { MetricsService } from '../src/shared/services/metrics.service';
import { HealthService } from '../src/shared/services/health.service';
import { MonitoringModule } from '../src/shared/monitoring.module';
import { PrismaModule } from '../prisma/prisma.module';

describe('Monitoring and Logging (e2e)', () => {
  let app: INestApplication;
  let loggerService: LoggerService;
  let metricsService: MetricsService;
  let healthService: HealthService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MonitoringModule, PrismaModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    loggerService = moduleFixture.get<LoggerService>(LoggerService);
    metricsService = moduleFixture.get<MetricsService>(MetricsService);
    healthService = moduleFixture.get<HealthService>(HealthService);
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Logger Service', () => {
    it('should log different levels correctly', () => {
      expect(() => {
        loggerService.info('Test info message', { test: true });
        loggerService.warn('Test warning message', { test: true });
        loggerService.error('Test error message', new Error('Test error'), { test: true });
        loggerService.debug('Test debug message', { test: true });
      }).not.toThrow();
    });

    it('should log audit events', () => {
      expect(() => {
        loggerService.audit('user_login', 'user123', 'auth', { ip: '127.0.0.1' });
        loggerService.audit('file_upload', 'user456', 'storage', { filename: 'test.glb' });
      }).not.toThrow();
    });

    it('should log performance metrics', () => {
      expect(() => {
        loggerService.performance('database_query', 150, { table: 'users' });
        loggerService.request('GET', '/api/users', 200, 250, 'user123');
      }).not.toThrow();
    });

    it('should log security events', () => {
      expect(() => {
        loggerService.security('failed_login', 'medium', { 
          ip: '192.168.1.100', 
          attempts: 3 
        });
        loggerService.security('suspicious_upload', 'high', { 
          filename: 'malware.exe', 
          userId: 'user789' 
        });
      }).not.toThrow();
    });
  });

  describe('Metrics Service', () => {
    beforeEach(() => {
      // Clear metrics before each test
      metricsService.clearMetrics();
    });

    it('should record HTTP request metrics', () => {
      expect(() => {
        metricsService.recordHttpRequest('GET', '/api/users', 200, 0.5);
        metricsService.recordHttpRequest('POST', '/api/assets', 201, 1.2);
        metricsService.recordHttpRequest('GET', '/api/scenes', 404, 0.1);
      }).not.toThrow();
    });

    it('should track WebSocket connections', () => {
      expect(() => {
        metricsService.incrementWebSocketConnections();
        metricsService.incrementWebSocketConnections();
        metricsService.decrementWebSocketConnections();
        metricsService.setWebSocketConnections(10);
      }).not.toThrow();
    });

    it('should track asset processing', () => {
      expect(() => {
        metricsService.setAssetProcessingJobs('pending', 5);
        metricsService.setAssetProcessingJobs('processing', 2);
        metricsService.recordAssetProcessing('3d_model', 'completed', 45.5);
      }).not.toThrow();
    });

    it('should record errors', () => {
      expect(() => {
        metricsService.recordError('validation_error', 'low');
        metricsService.recordError('database_error', 'high');
        metricsService.recordError('network_error', 'medium');
      }).not.toThrow();
    });

    it('should get metrics in Prometheus format', async () => {
      // Record some test metrics
      metricsService.recordHttpRequest('GET', '/test', 200, 0.1);
      metricsService.recordError('test_error', 'low');
      
      const metrics = await metricsService.getMetrics();
      
      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
    });
  });

  describe('Health Service', () => {
    it('should perform complete health check', async () => {
      const health = await healthService.getHealthCheck();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('version');
      expect(health).toHaveProperty('environment');
      expect(health).toHaveProperty('checks');
      expect(health).toHaveProperty('metrics');
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(typeof health.uptime).toBe('number');
      expect(health.checks).toHaveProperty('database');
      expect(health.checks).toHaveProperty('redis');
      expect(health.checks).toHaveProperty('storage');
      expect(health.checks).toHaveProperty('memory');
      expect(health.checks).toHaveProperty('disk');
    });

    it('should perform simple health check', async () => {
      const health = await healthService.getSimpleHealth();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health.status).toBe('ok');
    });
  });

  describe('Monitoring Endpoints', () => {
    it('/monitoring/health (GET)', async () => {
      const response = await request(app.getHttpServer())
        .get('/monitoring/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.status);
    });

    it('/monitoring/health/simple (GET)', async () => {
      const response = await request(app.getHttpServer())
        .get('/monitoring/health/simple')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    it('/monitoring/metrics (GET)', async () => {
      const response = await request(app.getHttpServer())
        .get('/monitoring/metrics')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/plain/);
      expect(typeof response.text).toBe('string');
    });

    it('/monitoring/status (GET)', async () => {
      const response = await request(app.getHttpServer())
        .get('/monitoring/status')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('version');
    });

    it('/monitoring/ready (GET)', async () => {
      const response = await request(app.getHttpServer())
        .get('/monitoring/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(['ready', 'not_ready']).toContain(response.body.status);
    });

    it('/monitoring/live (GET)', async () => {
      const response = await request(app.getHttpServer())
        .get('/monitoring/live')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('alive');
    });
  });

  describe('Monitoring Middleware', () => {
    it('should track request metrics through middleware', async () => {
      // Make a test request that will be tracked by middleware
      await request(app.getHttpServer())
        .get('/monitoring/status')
        .expect(200);

      // Get metrics to verify tracking
      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('http_request_duration_seconds');
    });
  });

  describe('Performance Testing', () => {
    it('should handle concurrent health checks', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/monitoring/health/simple')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.body.status).toBe('ok');
      });
    });

    it('should measure metrics collection performance', async () => {
      const startTime = Date.now();
      
      // Generate metrics data
      for (let i = 0; i < 100; i++) {
        metricsService.recordHttpRequest('GET', '/test', 200, 0.1);
        metricsService.recordUserActivity('test_action');
      }
      
      const metrics = await metricsService.getMetrics();
      const duration = Date.now() - startTime;
      
      expect(metrics.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should be fast
      
      console.log(`Metrics collection took ${duration}ms for 200 metric recordings`);
    });
  });
});

// Test helper to simulate load
function simulateLoad(app: INestApplication, requests: number = 50): Promise<any[]> {
  const promises = [];
  
  for (let i = 0; i < requests; i++) {
    const endpoint = ['/monitoring/status', '/monitoring/health/simple', '/monitoring/live'][i % 3];
    promises.push(
      request(app.getHttpServer())
        .get(endpoint)
        .expect(200)
    );
  }
  
  return Promise.all(promises);
}