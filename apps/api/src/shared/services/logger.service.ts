import winston, { createLogger } from 'winston';
import { Injectable } from '@nestjs/common';
import { loggerConfig } from '../config/logger.config';

@Injectable()
export class LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = createLogger(loggerConfig);
  }

  // Standard logging methods
  error(message: string, error?: Error, meta?: any) {
    this.logger.error(message, {
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      ...meta
    });
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }

  // Audit logging for security and compliance
  audit(action: string, userId: string, resource: string, details?: any) {
    this.logger.info(`Audit: ${action}`, {
      userId,
      action,
      resource,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Performance logging
  performance(operation: string, duration: number, meta?: any) {
    this.logger.info(`Performance: ${operation}`, {
      operation,
      duration,
      performance: true,
      ...meta
    });
  }

  // Request logging
  request(method: string, url: string, statusCode: number, duration: number, userId?: string) {
    this.logger.info(`${method} ${url}`, {
      http: {
        method,
        url,
        statusCode,
        duration,
        userId
      }
    });
  }

  // Database operation logging
  database(operation: string, table: string, duration: number, success: boolean, error?: Error) {
    this.logger.info(`Database: ${operation} on ${table}`, {
      database: {
        operation,
        table,
        duration,
        success,
        error: error ? error.message : undefined
      }
    });
  }

  // WebSocket event logging
  websocket(event: string, userId: string, sceneId: string, meta?: any) {
    this.logger.info(`WebSocket: ${event}`, {
      websocket: {
        event,
        userId,
        sceneId,
        ...meta
      }
    });
  }

  // Security event logging
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any) {
    this.logger.warn(`Security: ${event}`, {
      security: {
        event,
        severity,
        details,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Get the underlying Winston logger for advanced use cases
  getLogger(): winston.Logger {
    return this.logger;
  }
}

export default LoggerService;