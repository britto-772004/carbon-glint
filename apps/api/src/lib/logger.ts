import { pino } from 'pino';
import type { Config } from '../config.js';

export function createLogger(config: Pick<Config, 'LOG_LEVEL' | 'NODE_ENV'>) {
  return pino({
    level: config.LOG_LEVEL,
    // Cloud Logging reads `severity`; map pino levels onto it.
    formatters: { level: (label) => ({ severity: label.toUpperCase() }) },
    ...(config.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty', options: { colorize: true } } } : {}),
  });
}

export type Logger = ReturnType<typeof createLogger>;
