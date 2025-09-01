import winston from 'winston';

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
winston.addColors(customLevels.colors);

// Production log format
const productionFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
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
const developmentFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
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
  const transports: winston.transport[] = [];

  // Console transport (always present)
  transports.push(
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' 
        ? productionFormat 
        : developmentFormat,
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    })
  );

  // File transports for production or when LOG_TO_FILE is true
  if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
    // Combined logs
    transports.push(
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: productionFormat,
        ...fileRotationOptions,
      })
    );

    // Error logs
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: productionFormat,
        ...errorFileRotationOptions,
      })
    );

    // Audit logs
    transports.push(
      new winston.transports.File({
        filename: 'logs/audit.log',
        level: 'audit',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format.printf((info: any) => {
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
    transports.push(
      new winston.transports.File({
        filename: 'logs/security.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format.printf((info: any) => {
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
    transports.push(
      new winston.transports.File({
        filename: 'logs/performance.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format.printf((info: any) => {
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
    transports.push(
      new winston.transports.Http({
        host: process.env.LOG_AGGREGATION_HOST || 'localhost',
        port: parseInt(process.env.LOG_AGGREGATION_PORT || '3000'),
        path: process.env.LOG_AGGREGATION_PATH || '/logs',
        format: productionFormat,
      })
    );
  }

  return transports;
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