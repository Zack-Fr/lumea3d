import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../services/logger.service';
import { MetricsService } from '../services/metrics.service';

@Injectable()
export class MonitoringMiddleware implements NestMiddleware {
  constructor(
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const startHrTime = process.hrtime();

    // Get user info if available
    const userId = (req as any).user?.id || 'anonymous';
    
    // Extract route pattern for metrics
    const route = req.route?.path || req.path;
    const method = req.method;

    // Log request start
    this.logger.debug(`Incoming request: ${method} ${req.path}`, {
      method,
      url: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId,
      headers: {
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length'),
        authorization: req.get('Authorization') ? '[REDACTED]' : undefined,
      },
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      body: this.sanitizeRequestBody(req.body),
    });

    // Override end function to capture response data
    const originalEnd = res.end.bind(res);
    const self = this;

    res.end = function (chunk?: any, encoding?: any, cb?: () => void): any {
      const duration = Date.now() - startTime;
      const hrDuration = process.hrtime(startHrTime);
      const durationSeconds = hrDuration[0] + hrDuration[1] / 1e9;

      // Record metrics
      try {
        self.metrics.recordHttpRequest(method, route, res.statusCode, durationSeconds);
      } catch (error) {
        console.error('Error recording metrics:', error);
      }

      // Log request completion
      const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
      try {
        self.logger[logLevel](`Request completed: ${method} ${req.path}`, {
          method,
          url: req.path,
          statusCode: res.statusCode,
          duration,
          durationSeconds,
          userId,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          contentLength: res.get('Content-Length'),
          responseSize: chunk ? Buffer.byteLength(chunk.toString()) : 0,
        });
      } catch (error) {
        console.error('Error logging request completion:', error);
      }

      // Log slow requests
      if (duration > 1000) {
        self.logger.warn(`Slow request detected: ${method} ${req.path}`, {
          method,
          url: req.path,
          duration,
          userId,
          statusCode: res.statusCode,
        });
      }

      // Log errors
      if (res.statusCode >= 400) {
        const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
        const severity = res.statusCode >= 500 ? 'high' : 'medium';
        
        self.metrics.recordError(errorType, severity);
        
        self.logger.error(`HTTP Error: ${res.statusCode} for ${method} ${req.path}`, null, {
          method,
          url: req.path,
          statusCode: res.statusCode,
          userId,
          duration,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });
      }

      // Record user activity
      if (userId !== 'anonymous') {
        self.metrics.recordUserActivity(`${method.toLowerCase()}_${self.getActionFromPath(req.path)}`);
      }

      // Call original end function
      if (cb) {
        return originalEnd(chunk, encoding, cb);
      } else if (encoding) {
        return originalEnd(chunk, encoding);
      } else {
        return originalEnd(chunk);
      }
    };

    next();
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Limit body size for logging
    const bodyString = JSON.stringify(sanitized);
    if (bodyString.length > 1000) {
      return { 
        ...sanitized, 
        _truncated: true, 
        _originalSize: bodyString.length 
      };
    }

    return sanitized;
  }

  private getActionFromPath(path: string): string {
    // Extract meaningful action from path for user activity metrics
    const segments = path.split('/').filter(segment => segment && !segment.match(/^\d+$/));
    
    if (segments.length === 0) return 'root';
    if (segments.length === 1) return segments[0];
    
    // Take first two meaningful segments
    return segments.slice(0, 2).join('_');
  }
}

export default MonitoringMiddleware;