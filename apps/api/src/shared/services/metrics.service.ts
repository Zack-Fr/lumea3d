import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Counter, Histogram, Gauge, register, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleDestroy {
  private httpRequestsTotal: Counter<string>;
  private httpRequestDuration: Histogram<string>;
  private websocketConnections: Gauge<string>;
  private activeScenes: Gauge<string>;
  private assetProcessingJobs: Gauge<string>;
  private databaseConnections: Gauge<string>;
  private errorRate: Counter<string>;
  private assetProcessingDuration: Histogram<string>;
  private memoryUsage: Gauge<string>;
  private cpuUsage: Gauge<string>;
  private systemMetricsInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Collect default Node.js metrics
    collectDefaultMetrics({ register });

    // HTTP request metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    });

    // WebSocket metrics
    this.websocketConnections = new Gauge({
      name: 'websocket_connections_active',
      help: 'Number of active WebSocket connections',
    });

    // Scene metrics
    this.activeScenes = new Gauge({
      name: 'scenes_active_total',
      help: 'Number of active 3D scenes',
    });

    // Asset processing metrics
    this.assetProcessingJobs = new Gauge({
      name: 'asset_processing_jobs_active',
      help: 'Number of active asset processing jobs',
      labelNames: ['status'],
    });

    this.assetProcessingDuration = new Histogram({
      name: 'asset_processing_duration_seconds',
      help: 'Duration of asset processing in seconds',
      labelNames: ['type', 'status'],
      buckets: [1, 5, 10, 30, 60, 300, 600],
    });

    // Database metrics
    this.databaseConnections = new Gauge({
      name: 'database_connections_active',
      help: 'Number of active database connections',
    });

    // Error metrics
    this.errorRate = new Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'severity'],
    });

    // System metrics
    this.memoryUsage = new Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
    });

    this.cpuUsage = new Gauge({
      name: 'cpu_usage_percent',
      help: 'CPU usage percentage',
    });

    // Register all metrics
    register.registerMetric(this.httpRequestsTotal);
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.websocketConnections);
    register.registerMetric(this.activeScenes);
    register.registerMetric(this.assetProcessingJobs);
    register.registerMetric(this.assetProcessingDuration);
    register.registerMetric(this.databaseConnections);
    register.registerMetric(this.errorRate);
    register.registerMetric(this.memoryUsage);
    register.registerMetric(this.cpuUsage);

    // Start system metrics collection
    this.startSystemMetricsCollection();
  }

  // HTTP request tracking
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() });
    this.httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, duration);
  }

  // WebSocket connection tracking
  incrementWebSocketConnections() {
    this.websocketConnections.inc();
  }

  decrementWebSocketConnections() {
    this.websocketConnections.dec();
  }

  setWebSocketConnections(count: number) {
    this.websocketConnections.set(count);
  }

  // Scene tracking
  incrementActiveScenes() {
    this.activeScenes.inc();
  }

  decrementActiveScenes() {
    this.activeScenes.dec();
  }

  setActiveScenes(count: number) {
    this.activeScenes.set(count);
  }

  // Asset processing tracking
  setAssetProcessingJobs(status: string, count: number) {
    this.assetProcessingJobs.set({ status }, count);
  }

  recordAssetProcessing(type: string, status: string, duration: number) {
    this.assetProcessingDuration.observe({ type, status }, duration);
  }

  // Database connection tracking
  setDatabaseConnections(count: number) {
    this.databaseConnections.set(count);
  }

  // Error tracking
  recordError(type: string, severity: string) {
    this.errorRate.inc({ type, severity });
  }

  // System metrics
  private startSystemMetricsCollection() {
    // Keep the interval reference so it can be cleared on shutdown to avoid leaked handles in tests
    this.systemMetricsInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
      this.memoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
      this.memoryUsage.set({ type: 'external' }, memUsage.external);
      this.memoryUsage.set({ type: 'rss' }, memUsage.rss);

      // CPU usage (simplified - in production use proper CPU monitoring)
      const cpuUsage = process.cpuUsage();
      const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
      this.cpuUsage.set(totalUsage);
    }, 10000); // Collect every 10 seconds
  }

  onModuleDestroy() {
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval as NodeJS.Timeout);
      this.systemMetricsInterval = null;
    }

    // Clear registered metrics to avoid global state between tests
    try {
      register.clear();
    } catch (err) {
      // ignore errors during shutdown
    }
  }

  // Get metrics for Prometheus endpoint
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Clear all metrics (for testing)
  clearMetrics() {
    register.clear();
  }

  // Custom business metrics
  recordUserActivity(action: string) {
    const userActivityCounter = new Counter({
      name: 'user_activity_total',
      help: 'Total user activities',
      labelNames: ['action'],
    });
    
    if (!register.getSingleMetric('user_activity_total')) {
      register.registerMetric(userActivityCounter);
    }
    
    userActivityCounter.inc({ action });
  }

  recordApiLatency(endpoint: string, latency: number) {
    const apiLatencyHistogram = new Histogram({
      name: 'api_latency_seconds',
      help: 'API endpoint latency',
      labelNames: ['endpoint'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    if (!register.getSingleMetric('api_latency_seconds')) {
      register.registerMetric(apiLatencyHistogram);
    }

    apiLatencyHistogram.observe({ endpoint }, latency);
  }

  recordCacheHitRate(cache: string, hit: boolean) {
    const cacheHitCounter = new Counter({
      name: 'cache_requests_total',
      help: 'Total cache requests',
      labelNames: ['cache', 'result'],
    });

    if (!register.getSingleMetric('cache_requests_total')) {
      register.registerMetric(cacheHitCounter);
    }

    cacheHitCounter.inc({ cache, result: hit ? 'hit' : 'miss' });
  }

  recordQueueSize(queue: string, size: number) {
    const queueSizeGauge = new Gauge({
      name: 'queue_size',
      help: 'Current queue size',
      labelNames: ['queue'],
    });

    if (!register.getSingleMetric('queue_size')) {
      register.registerMetric(queueSizeGauge);
    }

    queueSizeGauge.set({ queue }, size);
  }
}

export default MetricsService;