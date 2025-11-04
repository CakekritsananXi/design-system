import winston from 'winston';
import path from 'path';

const logDir = process.env.LOG_FILE_PATH || './logs';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : process.env.LOG_LEVEL || 'info';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
      )
    ),
  }),
];

// Add file transports in production
if (process.env.NODE_ENV === 'production' && process.env.LOG_FILE_ENABLED === 'true') {
  // Error log
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Combined log
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Analytics log
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'analytics.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    })
  );

  // Social media API log
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'social-media-api.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create specialized loggers
export const analyticsLogger = winston.createLogger({
  level: 'info',
  format,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'analytics.log'),
      maxsize: 10485760,
      maxFiles: 10,
    }),
  ],
});

export const socialMediaLogger = winston.createLogger({
  level: 'info',
  format,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'social-media-api.log'),
      maxsize: 10485760,
      maxFiles: 10,
    }),
  ],
});

export const securityLogger = winston.createLogger({
  level: 'info',
  format,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'security.log'),
      maxsize: 5242880,
      maxFiles: 10,
    }),
  ],
});

export default logger;
