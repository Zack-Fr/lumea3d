import winston, { addColors, format, transports } from 'winston';

// Custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    audit: 2,
    info: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    audit: 'magenta',
    info: 'green',
    debug: 'blue',
  },
};

// Add colors to winston
addColors(customLevels.colors);

// Production log format
const productionFormat = format.combine(
  format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  format.errors({ stack: true }),
  format.splat(),
  format.json(),
  format.printf(({ timestamp, level, message, service, ...meta }) => {
    return JSON.stringify({
      '@timestamp': timestamp,
      level: level.toUpperCase(),
      message,
      service: service || 'lumea-api',
      environment: process.env.NODE_ENV || 'development',
      ...meta,
    });
  })
);

// Development log format
const developmentFormat = format.combine(
  format.timestamp({
    format: 'HH:mm:ss',
  }),
  format.errors({ stack: true }),
  format.colorize({ all: true }),
  format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaString = Object.keys(meta).length 
      ? `\n${JSON.stringify(meta, null, 2)}` 
      : '';
    return `${timestamp} [${service || 'API'}] ${level}: ${message}${metaString}`;
  })
);

// File rotation options
const fileRotationOptions = {
  maxsize: 10485760, // 10MB
  maxFiles: 10,
  tailable: true,
  zippedArchive: true,
};

// Error file rotation options
const errorFileRotationOptions = {
  maxsize: 5242880, // 5MB
  maxFiles: 5,
  tailable: true,
  zippedArchive: true,
};

// Create transports based on environment
export const createTransports = () => {
  const transportsList: winston.transport[] = [];

  // Console transport (always present)
  transportsList.push(
    new transports.Console({
      format: process.env.NODE_ENV === 'production' 
        ? productionFormat 
        : developmentFormat,
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    })
  );

  // File transports for production or when LOG_TO_FILE is true
  if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
    // Combined logs
    transportsList.push(
      new transports.File({
        filename: 'logs/combined.log',
        format: productionFormat,
        ...fileRotationOptions,
      })
    );

    // Error logs
    transportsList.push(
      new transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: productionFormat,
        ...errorFileRotationOptions,
      })
    );

    // Audit logs
    transportsList.push(
      new transports.File({
        filename: 'logs/audit.log',
        level: 'audit',
        format: format.combine(
          format.timestamp(),
          format.json(),
          format.printf((info: any) => {
            if (info.audit && typeof info.audit === 'object') {
              return JSON.stringify({
                '@timestamp': info.timestamp,
                level: 'AUDIT',
                ...info.audit,
              });
            }
            return JSON.stringify(info);
          })
        ),
        ...errorFileRotationOptions,
      })
    );

    // Security logs
    transportsList.push(
      new transports.File({
        filename: 'logs/security.log',
        format: format.combine(
          format.timestamp(),
          format.json(),
          format.printf((info: any) => {
            if (info.security && typeof info.security === 'object') {
              return JSON.stringify({
                '@timestamp': info.timestamp,
                level: 'SECURITY',
                severity: info.security.severity || 'unknown',
                event: info.security.event || 'unknown',
                details: info.security.details || {},
              });
            }
            return null; // Skip non-security logs
          })
        ),
        ...errorFileRotationOptions,
      })
    );

    // Performance logs
    transportsList.push(
      new transports.File({
        filename: 'logs/performance.log',
        format: format.combine(
          format.timestamp(),
          format.json(),
          format.printf((info: any) => {
            if (info.performance || info.http || info.database) {
              return JSON.stringify({
                '@timestamp': info.timestamp,
                level: 'PERFORMANCE',
                ...info,
              });
            }
            return null; // Skip non-performance logs
          })
        ),
        ...fileRotationOptions,
      })
    );
  }

  // External log aggregation (ELK stack, etc.)
  if (process.env.NODE_ENV === 'production' && process.env.LOG_AGGREGATION_URL) {
    transportsList.push(
      new transports.Http({
        host: process.env.LOG_AGGREGATION_HOST || '192.168.1.10',
        port: parseInt(process.env.LOG_AGGREGATION_PORT || '3000'),
        path: process.env.LOG_AGGREGATION_PATH || '/logs',
        format: productionFormat,
      })
    );
  }

  return transportsList;
};

// Logger configuration
export const loggerConfig = {
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: productionFormat,
  defaultMeta: {
    service: 'lumea-api',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    instance: process.env.INSTANCE_ID || 'local',
  },
  transports: createTransports(),
  exitOnError: false,
  handleExceptions: process.env.NODE_ENV === 'production',
  handleRejections: process.env.NODE_ENV === 'production',
};

export default loggerConfig;