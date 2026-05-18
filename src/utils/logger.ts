import pino from 'pino';
import { config, isDevelopment } from './config.ts';

export const logger = pino({
  level: config.logLevel,
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
});
