export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    storage: HealthCheckResult;
    memory: HealthCheckResult;
    disk: HealthCheckResult;
    realtime: HealthCheckResult;
  };
  metrics: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    activeConnections: number;
  };
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  message?: string;
  details?: any;
}

export interface SimpleHealth {
  status: string;
  timestamp: string;
}

export interface SystemStatus {
  status: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  environment: string;
  version: string;
  nodeVersion: string;
  platform: string;
  timestamp: string;
}

export interface ReadinessCheck {
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks?: {
    database: string;
    application: string;
  };
  error?: string;
}

export interface LivenessCheck {
  status: 'alive';
  timestamp: string;
  uptime: number;
}