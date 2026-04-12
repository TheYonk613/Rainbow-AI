import pino from 'pino';
import pinoHttp from 'pino-http';

/**
 * logger — shared pino instance for use throughout the server.
 *
 * Usage in route files:
 *   import { logger } from './middleware/logger.js';
 *   logger.info('Calendar synced for user %s', userId);
 *   logger.error({ err }, 'Sync failed');
 */
export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // In development, pretty-print with colors; in production emit clean JSON.
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined
});

/**
 * httpLogger — pino-http middleware for index.ts.
 *
 * Logs every request automatically:
 *   method, url, statusCode, responseTime, req.id
 *
 * Register before all routers:
 *   app.use(httpLogger);
 */
export const httpLogger = pinoHttp({
  logger,
  // Suppress health check noise in production logs
  autoLogging: {
    ignore: (req) => req.url === '/api/health'
  }
});
